# @yomedia/contracts

Intended home for shared input and output schemas that are consumed by more than one app or package.

Current repository schemas mostly live in `apps/api/src/modules/**.schema.ts` and frontend-local form schemas. Extract schemas here only when they are truly shared, and keep Zod as the validation library unless the project changes direction.
