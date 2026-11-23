# Making the app a habit, without tricking anyone

Review of the "Hooked" framework (the six-step video: the itch, the lazy thumb, the paved path, the slot machine, the bottomless pit, the piggy bank) against Mindset Approved.

**The short version:** the first three and the last are about making the app easy and personal, and they fit. The middle two (variable rewards and removing every stopping point) are what make apps compulsive. They don't fit a tool people use to make food decisions, so they're out.

## Why not copy all six
Mindset Approved sells **trust**. The whole product says "this verdict is honest and reflects your rules". An app that also borrows slot-machine tricks undermines that. There are practical reasons too:
- **Slot machine** (random badges and rewards): a verdict must never feel random, and gamifying "Not Approved" invites the wrong kind of engagement.
- **Bottomless pit** (never show a way out): scanning is a task with an end. People want to put the phone away and shop. Apple and Google both discourage manipulative design, and a wellness-adjacent app that does it risks reviews and press.
- **"We miss you" and streak-guilt notifications:** the video itself calls generic ones corporate speak. Ours would also be unwelcome in a health-adjacent app.

## What we adopted

| Idea | What it means here | Status |
|---|---|---|
| **The itch** (an internal trigger, not a reminder) | The feeling is *standing in the aisle wondering "is this okay?"*. The app should be the thing people reach for then. The store listing and the welcome screen lead with that moment ("Know what's in it. In a second."). | In place, plus the opt-in shop-day reminder. |
| **The lazy thumb** (one easy action) | The core action is checking one product. The app opens on Scan; barcodes read themselves with no tap; the label shutter is the biggest control, at the bottom, reachable one-handed. | In place. **New:** it now opens on the tab you used last. |
| **The paved path** (good defaults) | Defaults decide for people: Standard rules, English plus the chosen label language, barcode first, "product not found" moves straight to the label camera. | In place. |
| **Bottomless pit**, the useful half | Every screen should lead somewhere, so nothing is a dead end. It stops short of trapping anyone. | **New:** "Scan another" under every result, and "Scan your first product" on the empty History. |
| **The piggy bank** (what you'd lose by leaving) | Your rules, saved products and history are real value on the phone. | In place, plus saved products that re-check when your rules change. |

## Built from this review
1. **Saved products re-check themselves.** Tapping Save on a result records its verdict. When rules or settings change and a saved product's verdict moves, History says so ("1 of your saved products now gets a more relaxed verdict, because your rules changed") and marks the row ("Was Not Approved when you saved it"). "Got it" resets the baseline. History rows now show today's verdict, not the one from scan time.
2. **Shop-day reminder, opt-in.** Settings → Shop-day reminder: choose a day and a time (morning, midday, after work). One local notification a week: "Heading to the shop? Check labels before they hit the basket." It comes from the phone, not a server, and turning it off cancels it. The phone app only (the web preview has no notifications).
3. **First-week habit measure.** Admin → Stats → "First-week habit": for each week's new phones, the share that checked 3+ products in their first 7 days and the share that came back in days 8-14. A figure is withheld until its window has fully passed, so a young cohort doesn't look worse than it is. Aggregates only.

4. **Quiet milestones, not streaks.** The 10th, 25th, 50th, 100th, 250th and 500th product get one calm line on the result ("That's 10 products you've checked."). Nothing in between, and no streak counter to lose.

## Still to do
- **Read the numbers.** Once real people are scanning, check whether phones that reach three scans in week 1 come back more often. If the gap is small, the habit moment is something else (try 5 scans, or a saved product) and the measure should change.
- **Keep the first result fast.** Barcode is one scan and a label photo is two taps. Don't put anything between the camera and the result as features are added.

## Rules for any engagement feature
- It helps the person decide or saves them time, or it doesn't ship.
- Notifications are opt-in, tied to a real moment, and can be turned off in one tap.
- No rewards that are random, no countdowns, no guilt copy.
- We never change a verdict, wording or order to keep someone in the app.
