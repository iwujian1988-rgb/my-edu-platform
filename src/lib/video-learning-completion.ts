export async function completeLearningAndReturn(actions: {
  saveProgress: () => Promise<void>
  markCompleted: () => Promise<void>
  returnHome: () => void
}) {
  await actions.saveProgress()
  await actions.markCompleted()
  actions.returnHome()
}
