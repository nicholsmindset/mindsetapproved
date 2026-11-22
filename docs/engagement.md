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
| **The itch** (an internal trigger, not a reminder) | The feeling is *standing in the aisle wondering "is this okay?"*. The app should be the thing people reach for then. The store listing and the welcome screen lead with that moment ("Know what's in it. In a second."). | In place. Next: opt-in shop-day reminder (below). |
| **The lazy thumb** (one easy action) | The core action is checking one product. The app opens on Scan; barcodes read themselves with no tap; the label shutter is the biggest control, at the bottom, reachable one-handed. | In place. **New:** it now opens on the tab you used last. |
| **The paved path** (good defaults) | Defaults decide for people: Standard rules, English plus the chosen label language, barcode first, "product not found" moves straight to the label camera. | In place. |
| **Bottomless pit**, the useful half | Every screen should lead somewhere, so nothing is a dead end. It stops short of trapping anyone. | **New:** "Scan another" under every result, and "Scan your first product" on the empty History. |
| **The piggy bank** (what you'd lose by leaving) | Your rules, saved products and history are real value on the phone. | In place. Next: saved staples (below). |

## Next, in order of value

1. **Saved staples.** "Save" already exists. Turn it into a short list of the products you buy every week, with a re-check against your rules when they change ("2 of your 14 staples changed"). This is the honest piggy bank: real value that would be lost on uninstall, and it gives a genuine reason to come back after a rules update.
2. **Shop-day reminder (opt-in).** One local notification on the day and time you choose, in the voice of the feeling: *"Heading to the shop? Check labels before they hit the basket."* No account and no server; it only exists if the person turns it on in Settings. Never "we miss you".
3. **Three scans in the first week.** The video says TikTok found its "habit moment" at 260 videos. Ours is probably *three products checked in the first week*. We can't know until we measure it, so add one anonymous count (scans per install per week, which the database already records) to the admin stats page, and watch whether people who reach three come back.
4. **Faster first result.** Count taps from opening the app to a verdict: barcode is one scan, a label photo is two taps. Keep it that way as features are added, and don't put anything between the camera and the result.
5. **Quiet milestones, not streaks.** After a person's 10th scan, one calm line on the result ("You've checked 10 products"). No streak counter and no loss-aversion pressure.

## Rules for any engagement feature
- It helps the person decide or saves them time, or it doesn't ship.
- Notifications are opt-in, tied to a real moment, and can be turned off in one tap.
- No rewards that are random, no countdowns, no guilt copy.
- We never change a verdict, wording or order to keep someone in the app.
