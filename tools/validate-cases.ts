import { cases } from '../src/data/caseIndex'
import { validateCase } from '../src/engine/validate'

let hasErrors = false

for (const caseDef of cases) {
  const result = validateCase(caseDef)
  if (result.valid) {
    console.log(`OK   ${caseDef.id}`)
  } else {
    hasErrors = true
    console.log(`FAIL ${caseDef.id}`)
    for (const error of result.errors) {
      console.log(`     - ${error}`)
    }
  }
}

if (hasErrors) {
  process.exit(1)
}
