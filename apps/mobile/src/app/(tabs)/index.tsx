import { router, useIsFocused } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { consume, FREE_LIMITS } from "@/core/limits";
import { recognizeLabel } from "@/platform/ocr";
import { Scanner } from "@/scan/Scanner";
import type { ScanMode } from "@/scan/types";
import { photoByEntry, useApp } from "@/state/app";
import { Button, Footnote, Notice, Tabs, Title } from "@/ui/kit";
import { MAX_WIDTH, radius, space, type, useColors } from "@/ui/theme";

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => sub.remove();
  }, []);
  return active;
}

export default function ScanScreen() {
  const c = useColors();
  const app = useApp();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [mode, setMode] = useState<ScanMode>(() => app.store.getScanMode());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "info" | "error";
    premium?: boolean;
  } | null>(null);
  /** A barcode the databases didn't know: the label photo that follows is saved against it. */
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

  const open = (id: string) =>
    router.push({ pathname: "/result/[id]", params: { id } });

  const onBarcode = useCallback(
    async (code: string) => {
      setBusy("Looking up the product…");
      setNotice(null);
      try {
        const hit = await app.lookup(code);
        if (hit) {
          const { entry } = app.scan({
            text: hit.text,
            source: hit.source,
            ocrConfidence: 1,
            barcode: hit.barcode,
            productName: hit.name,
            brand: hit.brand,
          });
          setPendingBarcode(null);
          open(entry.id);
        } else {
          setPendingBarcode(code.replace(/\D/g, ""));
          setMode("label");
          setNotice({
            text: "Product not found. Snap the ingredient list instead.",
            tone: "info",
          });
        }
      } finally {
        setBusy(null);
      }
    },
    [app],
  );

  const runLabel = useCallback(
    (text: string, confidence: number, photo?: string) => {
      const { entry } = app.scan({
        text,
        source: "label",
        ocrConfidence: confidence,
        barcode: pendingBarcode ?? undefined,
      });
      if (photo) photoByEntry.set(entry.id, photo);
      setPendingBarcode(null);
      setNotice(null);
      open(entry.id);
    },
    [app, pendingBarcode],
  );

  const onPhoto = useCallback(
    async (uri: string) => {
      if (!consume(app.store, "label")) {
        setNotice({
          text: `You've used today's ${FREE_LIMITS.label} free label scans. Barcode scans are unlimited.`,
          tone: "error",
          premium: true,
        });
        return;
      }
      setBusy("Reading the label…");
      try {
        const { text, confidence } = await recognizeLabel(
          uri,
          app.store.getLabelScript(),
        );
        if (!text.trim()) {
          setNotice({
            text: "No text found. Move closer and make sure the label is in focus.",
            tone: "error",
          });
          return;
        }
        runLabel(text, confidence, uri);
      } catch (e) {
        setNotice({
          text: `Couldn't read the photo: ${(e as Error).message}`,
          tone: "error",
        });
      } finally {
        setBusy(null);
      }
    },
    [app.store, runLabel],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* The camera fills the phone screen; the web form is taller than a screen, so it scrolls. */}
      <ScrollView
        scrollEnabled={Platform.OS === "web"}
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: MAX_WIDTH,
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: Platform.OS === "web" ? 120 : space.md,
            gap: space.md,
          }}
        >
          <Title
            aside={
              <View
                style={{
                  backgroundColor: c.fill,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={[type.caption, { color: c.muted, fontWeight: "600" }]}
                >
                  Rules v{app.rules.bundle.version}
                  {app.online ? "" : " · Offline"}
                </Text>
              </View>
            }
          >
            Scan
          </Title>

          <Tabs
            value={mode}
            options={[
              { id: "barcode", label: "Barcode", symbol: "barcode.viewfinder" },
              {
                id: "label",
                label: "Ingredients",
                symbol: "doc.text.viewfinder",
              },
            ]}
            onChange={(m) => {
              setMode(m);
            app.store.setScanMode(m);
              setNotice(null);
            }}
          />

          {notice ? (
            <Notice
              tone={notice.tone}
              action={
                notice.premium ? (
                  <Button
                    style={{ alignSelf: "flex-start" }}
                    symbol="sparkles"
                    label="See Premium"
                    onPress={() => router.push("/upgrade")}
                  />
                ) : undefined
              }
            >
              {notice.text}
            </Notice>
          ) : null}

          <View
            style={{
              flex: Platform.OS === "web" ? undefined : 1,
              minHeight: 320,
            }}
          >
            <Scanner
              mode={mode}
              active={focused && appActive && !busy}
              onBarcode={(code) => void onBarcode(code)}
              onPhoto={(uri) => void onPhoto(uri)}
              onLabelText={(text) => runLabel(text, 1)}
            />
            {busy ? (
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  borderRadius: radius.xl,
                  borderCurve: "continuous",
                  gap: space.md,
                }}
              >
                <ActivityIndicator color="#fff" size="large" />
                <Text style={[type.headline, { color: "#fff" }]}>{busy}</Text>
              </View>
            ) : null}
          </View>
          {pendingBarcode ? (
            <Footnote>
              Barcode {pendingBarcode} will be saved with this label, so the
              next scan is instant.
            </Footnote>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
