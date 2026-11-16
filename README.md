# Token Launch Radar

Token Launch Radar ranks protocols by the implied value of a token they have not issued yet, computed from the sealed DefiLlama snapshot.

## Value Model in Brief
Implied value is a TVL-anchored multiple adjusted by 7d momentum, years since listed_at, category, and chain breadth. Protocols that already have a token sit in a low band.

## How to Run
```bash
node main.ts --input <snapshot.json>
```
Output directory is read from `MAKEFUN_OUTPUT_DIR`.

## Repo Layout
- `main.ts`: Main entry point / ranking engine
- `dashboard/`: Web dashboard files
- `screenshots/`: Dashboard screenshots
- `vendor/`: Vendor dependencies

## License
MIT License.
