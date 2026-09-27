# Reframe demo script

## Opening

“Today I’m presenting Reframe, a creative workspace for making targeted changes to generated images without flattening the whole scene. The workflow is: generate a scene, understand its structure, select one part, describe a change, review the affected region, and keep every version available.”

“I’ll use a futuristic amusement-park scene as the example. Watch how the interface keeps the image editable and the change bounded.”

## Layer column

“On the left is the layer column. It is the scene’s table of contents. Reframe lists image layers and the objects detected in the generated scene. Each row has a name and type, and the selected row stays synchronized with the canvas.”

“I can click an object directly in the artwork or choose it from the column. For regular Canvas layers, this area also supports selecting, moving, duplicating, arranging, and opening layer properties.”

## Inspect

“Next I’ll switch to Inspect. Hovering highlights an object’s approximate region. Clicking opens the right inspector with its name, type, description, depth estimate, relationships, and persistent identity.”

“I’ll select the Ferris wheel and describe the change in plain language. Reframe prepares the edit before rendering and shows the proposed instruction and approved rectangle. I can adjust that rectangle for context, shadows, or a new position. Pixels outside the approved region remain protected.”

## Compare

“After applying the edit, I’ll open Compare. This is a before-and-after slider: the original stays on one side, the current version on the other, and the handle lets me inspect the boundary.”

“I can confirm that the Ferris wheel changed while the rest of the park stayed stable. Compare is also useful for subtle changes because I do not have to remember the original.”

## Scene map

“Scene map gives me the spatial overview. Detected entities are laid out according to their positions in the image, and selecting a map item selects the same entity in the canvas and inspector.”

“This is useful for crowded scenes: it helps me find a distant sign, person, or garden quickly and understand foreground and background relationships before editing.”

## Store

“Reframe stores a scene rather than one disposable export. The original is saved first, every successful edit becomes a new immutable version, and the entity snapshot and instruction travel with that version.”

“Version History shows the original and each reframe. I can restore any version or undo the current edit. If I continue after restoring an older version, Reframe preserves the saved history and creates a new branch. When finished, I can export the composed Canvas as a PNG.”

## Closing

“That is the Reframe workflow: the layer column organizes the scene, Inspect explains what can be edited, Compare verifies the result, Scene map provides spatial context, and Store preserves the creative history. Together, these views turn image generation into a controlled, iterative design process.”
