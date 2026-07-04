# Episodes Map — Old vs New Comparison

This document captures every meaningful difference between the **old** episodes
map (committed, working well) and the **new** in-progress rewrite (uncommitted
working-tree changes). It explains *why* the old map looked correct and the new
one renders poorly.

> Status: the new map is a **mid-migration**. `map.json` / `palm.json` are
> deleted, many new files are untracked, and the main feature doc
> (`docs/episodes_map.md`) still describes the OLD architecture.

---

## 1. Map data format

| | Old | New |
|---|---|---|
| Source | Single `assets/json/map.json` | Five per-theme scenery files: `desert/desert-v6.json`, `island/island-v2.json`, `forest/forest-v5.json`, `sea/sea-v4.json`, `snow/snow-v3.json` |
| Authoring | Hand-authored gameplay metadata baked in | "Scenery-only" exports — geometry + images, no gameplay fields |
| Per-tile number | Explicit `assignedNumber` on each level tile | None — inferred at runtime |
| Per-prop animation | Explicit `lottieAsset` + offset fields per prop | None — inferred at runtime |
| Theme selection | Single map | `MapTheme.forSeriesIndex(seriesIndex)` picks 1 of 5 (cycled `% 5`) |

**Net effect:** the new JSONs dropped the authored fields the gameplay logic
depended on, forcing the code to *guess* them.

---

## 2. Level tile / episode-node placement  ← main cause of "nodes scattered"

### Old
- Each tile carried `assignedNumber`.
- `EpisodesMapEntity` built `levels` by sorting on that number and used each
  tile's authored coordinates.
- Deterministic: tile 1 was tile 1, placed exactly where the designer put it.

### New
- No numbers in the data, so `findLevelTiles()` **heuristically detects** tiles:
  - name matches `^Group \d+$` or `^\d+$`, **and**
  - footprint fits a single global size/aspect window
    (`tileMinWidth..tileMaxWidth`, `tileMinHeight..tileMaxHeight`,
    `tileMinAspect..tileMaxAspect` in `EpisodesMapDimens`).
- Detected tiles are **sorted by descending X only**.
- `resolveEpisodeProgress` pairs `episodes[i]` → `tiles[i]` by index;
  `count = min(episodes.length, tiles.length)` (extra episodes dropped).

### Why the new placement breaks
1. **False positives / misses.** One global size window for all five themes;
   each theme's tiles are different pixel sizes. Real tiles fall outside the
   window (missed) while `Group`-named decorations fall inside (picked) → nodes
   land on random scenery.
2. **X-only ordering.** The path snakes up/down, so tiles aren't monotonic in X.
   Sorting by X scrambles episode order → nodes appear scattered, not along the
   trail.
3. **Count mismatch.** Too many false positives → wrong first-N tiles used;
   too few → episodes silently dropped.

Relevant: `domain/find_level_tiles.dart`,
`domain/episode_progress_resolver.dart`, `EpisodesMapDimens.tileMin/Max*`.

---

## 3. Character / walking journey

| | Old | New |
|---|---|---|
| Movement | Character **walked** step-by-step between tiles with an arc lift | **Static** sprite on one node |
| Route | Stepping-stone route (`RouteNode`, `LevelTile`, `routeBetweenLevels`, `routeSegmentForLevel`) revealed as you progressed | Removed |
| Camera | Direction-aware follow as the character walked | Single scroll-to-person on load |
| Controllers | Separate walk + idle controllers | Both walk & idle wired to the **same** `_idleController`; `walking: false` |

Deleted: `domain/entities/level_tile.dart`,
`domain/entities/route_node.dart`, and the route logic in
`episodes_map_entity.dart`. The "journey" feel is gone.

---

## 4. Lottie / palm animation  ← cause of "palm looks bad"

### Old
- Each animated prop carried `lottieAsset` + offset in the JSON.
- Single `assets/json/palm.json`.
- Rendered at the prop's exact size/position with authored offset → palm
  anchored to the ground, correct size and aspect. Perfect.

### New
- `MapTheme` lists flat `lottiePaths` per theme (no per-prop binding).
- `planLottieOverlays()` **guesses** foliage props via `_tallFoliagePaletteIds`:
  every portrait, non-background, non-tile prop whose height ≥ 70%
  (`lottieFoliageHeightThreshold`) of the tallest portrait prop.
- Theme Lotties assigned to those palettes **by iteration index** (cycled),
  drawn into the prop's bounding box with `BoxFit.contain`, the static PNG
  hidden, at `ambientOpacity = 0.9`.
- Ambient effects (snow / fish / bubbles) placed by hard-coded fractions.

### Why the new palm breaks
1. **Wrong props animate.** One palm clip applied to *every* tall portrait prop
   (other trees, plants, rocks); props under the 70% threshold stay static →
   mismatched mix.
2. **Wrong size/aspect.** `contain` letterboxes the clip inside the prop box;
   without the old offset the palm floats / shrinks / shifts off the trunk base.
3. **Wrong clip.** Multiple theme clips (`palm 2.json` + `plant 1.json`) handed
   out by index, not by prop shape.
4. **Translucent.** Drawn at 0.9 opacity vs. the crisp old prop.
5. **Can vanish.** Static PNG is hidden when an overlay is planned, but Lottie
   load failures are swallowed silently (filenames contain spaces, e.g.
   `palm 1.json`, and live in per-theme subfolders that must each be registered
   in `pubspec.yaml`). On failure the prop shows neither image nor animation.

Relevant: `domain/lottie_overlay_plan.dart`,
`presentation/.../episodes_map_ambient_lottie.dart`,
`presentation/.../episodes_map_prop_visual.dart`,
`EpisodesMapDimens.ambient*` / `lottieFoliageHeightThreshold`.

---

## 5. Runtime dependencies

| | Old | New |
|---|---|---|
| Data | Self-contained local asset | Local scenery **+ remote** episode list **+ remote** kid progress |
| New code | — | `get_series_episodes_usecase`, `get_kid_progress_usecase`, `episode_progress_resolver`, `series_episodes_model`, `kid_progress_model`, remote data sources |
| Node states | n/a (numbered tiles) | completed / current / timeLocked / future, computed from progress + 7-day unlock cadence |
| Failure mode | Asset missing → error screen | Progress fetch non-fatal (defaults incomplete); episodes/scenery fetch fatal → error screen; empty episodes → empty/too-few nodes |

---

## 6. Cubit / state

| | Old | New |
|---|---|---|
| Load trigger | `loadMap()` on construction | **Not** in constructor — router sets `seriesId`/`seriesTitle`/`seriesIndex` first, then `loadMap()` (avoids "error first, works on retry") |
| Parallel loads | Single map fetch | Three concurrent futures: scenery, episodes, progress |
| State fields | `isLoading`, `map?`, `error?` | adds `theme`, `nodes`, `personNodeIndex`, `personHidden`, `isEmpty`/`hasMap` |

---

## 7. Root-cause summary

The old map stored **authored gameplay metadata** in the JSON:
- `assignedNumber` per tile  → exact node placement & order
- `lottieAsset` + offset per prop → exact palm placement & size

The new "scenery-only" exports **stripped those fields**, so the rewrite
re-derives them with runtime heuristics:
- tiles via name-regex + global size window + X-sort
- foliage via "tall portrait prop" detection + index-cycled clips

Both heuristics misfire on the real exports → **scattered nodes** and
**mis-placed / missing palms**. The old map didn't guess, so it was exact.

---

## 8. Suggested fixes (most robust first)

1. **Re-author the metadata** in the new theme JSONs: add an explicit
   tile number/marker per path tile and a `lottieAsset` (+ offset) per animated
   prop; have `findLevelTiles` / `planLottieOverlays` read those instead of
   guessing. (Closest to the old, "perfect" behaviour.)
2. If keeping auto-detection: make the tile size window **per-theme**, tighten
   name matching, and order tiles by the actual path sequence (not raw X);
   match foliage clips to prop shape rather than index.
3. Fix asset robustness: register every per-theme Lottie folder in
   `pubspec.yaml`, and don't hide the static prop unless its Lottie actually
   loaded (so a load failure falls back to the PNG instead of vanishing).
4. Restore the walking animation / route if the journey feel is wanted.
