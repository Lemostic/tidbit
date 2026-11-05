# UI Research Notes

## Sources

- Apple Human Interface Guidelines, Materials:
  https://developer.apple.com/design/human-interface-guidelines/materials
  - Materials create depth and hierarchy; Liquid Glass belongs to the functional layer (controls/navigation), not the content layer.
  - Glass effects should be used sparingly and must preserve legibility.
- Apple Human Interface Guidelines, Layout:
  https://developer.apple.com/design/human-interface-guidelines/layout
  - Order content by importance, group related items, differentiate controls from content, and use progressive disclosure.
- Apple Human Interface Guidelines, Typography:
  https://developer.apple.com/design/human-interface-guidelines/typography
  - Strong hierarchy comes from size, weight, and color; minimize the number of typefaces.
- Apple Human Interface Guidelines, Motion:
  https://developer.apple.com/design/human-interface-guidelines/motion
  - Motion should be purposeful, brief, and optional; avoid animating frequent interactions.
- Microsoft Windows app design, Materials:
  https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials
  - Mica is an opaque base layer; Acrylic is for transient surfaces; materials should resemble real-life artifacts.
- Microsoft Windows app design, Typography:
  https://learn.microsoft.com/en-us/windows/apps/design/style/typography
  - Use a clear type ramp, semibold rather than bold emphasis, and flush-left text for scanning.
- Microsoft Windows app design, Color:
  https://learn.microsoft.com/en-us/windows/apps/design/style/color
  - Use color sparingly for interaction and hierarchy; maintain contrast across light and dark themes.

## Synthesis

The strongest current direction for a sticky-note desktop tool is not another translucent dashboard. It is **tactile editorial minimalism**:

- functional chrome is visually distinct from user content;
- paper warmth and slight physical irregularity create recognition and calm;
- a single sealing-red accent carries interactivity and focus;
- typography creates hierarchy before decoration does;
- material depth is used at layer boundaries, not on every card;
- motion follows physical expectations (paper lifting, line settling) rather than generic fades.

This keeps the product current without turning it into a trend collage.

## Design Decision

Adopt an **Ink & Paper / 纸本工作台** system:

- Deep ink rail and controls.
- Warm paper content surfaces with a faint fiber/ruled texture.
- Vermilion seal accent; teal, ochre, and indigo only for user-selectable markers.
- Editorial display type for brand and headings; UI sans for controls; mono for metadata.
- Glass limited to titlebar/rail/transient overlays, never note cards or the editor paper.
