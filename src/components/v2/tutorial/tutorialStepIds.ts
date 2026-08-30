/** Reading order of the explainer. Every id has a `v2.howTo.steps.<id>.*` block in each bundle. */
export const tutorialStepIds = ['goal', 'rowcol', 'neighbour', 'objects', 'tools', 'verdict'] as const

export type TutorialStepId = (typeof tutorialStepIds)[number]
