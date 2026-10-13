# SendPulse flow: the agent collects the lead, and the graph has no loops

SendPulse rejects any cycle. A chain block does not make a path legal if some arrow still returns to the same AI Agent.

## Arrows to delete

| Arrow | Why it cycles |
|---|---|
| Tag back to AI Agent 2 | Agent 2, filter, API, tag, agent 2 |
| AI Agent 2 (price goal) back to the sheet | Sheet, agent 2, sheet |
| AI Agent 2 (lead goal) back to the filter | Filter, API, tag, agent 2 |
| Filter “no” back to AI Agent 1 | Agent 1 returns to itself |
| Tag, chain, AI Agent 1 | Agent 1 eventually returns to itself |

Every branch has to end with no outgoing arrow. The next visitor message is a new run: the “Standard reply” trigger starts AI Agent 1 again. That trigger is not an arrow on the canvas, so it is not a cycle.

## Shape that saves

```
[Trigger: Standard reply] --> AI Agent 1
                                 |
                    +------------+------------+
                    |                         |
               Goal 1 (price)            Goal 2 (lead)
                    |                         |
              Google Sheet            Filter: phone is set
                    |                         |
              Filter: price?            API --> Telegram
                    |                         |
             +------+------+                  |
            yes           no                  |
             |             |                  |
          Message       Message               |
          with price    "I will check"        |
          [END]         [END]                 |
                                              |
                                    Tag handed-to-manager
                                         [END]
```

Delete AI Agent 2. After the sheet, use a Message block.

## Do this once

1. Delete the arrows listed above.
2. Delete AI Agent 2, or leave it with no outgoing arrows.
3. After the sheet: a filter, then a Message with the price, with “wait for a reply” off, then stop.
4. After the tag: connect nothing.
5. Chain settings: Standard reply points at AI Agent 1.
6. Save.

## Goal 2 must not fire twice

Add to the goal description: the visitor is ready to deliver, the material, volume, city, and phone are known, and this conversation has not already recorded the request.

Or, before the phone filter, require that the handed-over tag is empty.

## Why the bot goes quiet after “I will check the price”

When goal 1 fires, the AI Agent block ends. The Google Sheet block only fills `product_price`. It does not write to the visitor. If the next block is only a chain and a tag, the visitor sees nothing until they type again.

After the sheet, add a Message that sends the price immediately, with “wait for a reply” turned off.

Do not put a data-input step for the phone or for `volume_kg` on that price branch. Do not draw an arrow back to the same agent.

## Price branch

1. Disconnect the sheet from the chain.
2. Sheet, then a filter: `product_price` is not empty.
3. Mapping: product name, price into `product_price`, accepted, note.
4. Yes: a Message, wait turned off. Example, in Ukrainian for the supplier: the current price for `{{product_name}}` is `{{product_price}}`, and ask for an approximate volume. Connect nothing after it.
5. No: a Message that you will check the price and come back. Connect nothing after it.
6. The handed-over tag is the end of the lead branch. Do not attach a chain and do not return to the agent.

## Lead branch, after goal 2

1. Filter: phone is not empty.
2. Optional filter: the handed-over tag is not set.
3. API request to Telegram. The JSON shape is `04_TELEGRAM_NOTIFY_BODY.json`. Leave “save API response” empty.
4. Set the handed-over tag.
5. End. The next visitor message hits Standard reply and AI Agent 1.

Do not use “open chat and pause for 3 hours”. The bot will stop answering.

## Variables

| Name | Type | Meaning |
|---|---|---|
| `Name` | string | How the visitor introduced themselves |
| `product_name` | string | Material, lower case, the name used on the sheet |
| `product_price` | string | Price from the sheet |
| `phone` | string | Stored as `+380XXXXXXXXX` |
| `volume_kg` | string | Number only |
| `client_location` | string | City or region |
| `lead_summary` | string | Material, volume, place, fresh or dried, readiness |

## Exit goals

Goal 1, price: the visitor asked the current buying price for a specific plant, and the name is already clear. Save the canonical sheet name into `product_name` (lower case; a Russian or mixed spelling maps to the sheet name).

Goal 2, lead: name, material, fresh or dried, kilograms, city, and a phone are all present, and this conversation has not already been handed over (`lead_summary` empty, tag not set). Save phone, product, volume, location, and the summary.

## What a finished exchange looks like

The visitor asks the price of wormwood. The agent says it will look. The sheet fills `product_price`. The Message block sends the price and asks for volume. The visitor replies with kilograms, a city, and a phone. The agent confirms, and the lead branch notifies the manager. The channel link, if you send one, is your own invite, not a link stored in this repository.
