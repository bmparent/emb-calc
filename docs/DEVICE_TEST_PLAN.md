# Physical-device / TestFlight acceptance record

Status: **not run**. Browser WebKit and simulator launch evidence are recorded separately.

Record candidate commit, TestFlight version/build, iPhone/iPad model, OS, tester and date. Never attach private customer artwork to the public repository. Use synthetic fixtures.

| Check | Expected result | Actual / pass / fail |
|---|---|---|
| Fresh install A → B → C | Manual entry, calculated batch plan and saved quote are understandable without coaching | not run |
| Airplane mode / cold launch | Jobs, estimate, tools, help and privacy work without network | not run |
| Files import and cancel | DST import and JSON restore work; cancel preserves current job | not run |
| PDF/JSON share and cancel | Files open in chosen destination; cancel returns without an error or a lost job | not run |
| Camera allowed/denied | Optional capture works; denial leaves image import and production usable | not run |
| Background / force quit | Latest confirmed save reopens; unconfirmed save is never reported durable | not run |
| Pause overnight | Excluded interval survives restart; resume/finish matches timestamps | not run |
| Restore previous snapshot | On seeded corruption, export recovery, restore previous and continue saving | not run |
| Low storage | Failed save is visible, production status stays unchanged, export remains available when storage permits | not run |
| Upgrade over previous candidate | Existing jobs retain IDs, source inputs, statuses and formula history | not run |
| VoiceOver | Labels, step changes, validation and status messages are announced; all actions reachable | not run |
| Larger Text / display zoom | Content reflows, labels stay readable, primary actions remain reachable | not run |
| Keyboard / rotation / safe areas | Focused fields and next actions remain accessible on iPhone/iPad in both orientations | not run |
| Long job/Shop interaction | Profile saves, unsaved edit warnings, restored conflicts and cost changes are clear | not run |
| Network inspection | No unsolicited developer/analytics requests while performing local workflows | not run |

Simulator/low-storage corruption tests must operate only on disposable test installs. Never damage or fill a user's primary phone to manufacture a test. Back up real jobs before upgrade or recovery testing. Record observed defects with reproduction steps and keep the release blocked for data loss, inaccessible primary actions or incorrect calculations.
