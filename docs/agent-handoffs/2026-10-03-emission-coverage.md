# Emission coverage proposal handoff

Repository: entrius/allways-ui
Local checkout: /Users/grant/Documents/Allways/allways-ui-emission-coverage
Branch: docs/admin-miner-emission-coverage
Base: test

Grant requested a reviewable PR preserving the dynamic-burn discussion for Landyn and Ander, with an admin stat tracking the percentage of miner emissions offset by fees. Added docs/proposals/admin-miner-emission-coverage.md with the reporting-only scope, aligned-window formula, data requirements, failure states, historical context, dynamic-burn caveats, and implementation acceptance criteria. No runtime code changed.

Validation: documentation formatting, git diff whitespace check, and arithmetic fixture checks. Application checks are deferred to implementation because this PR only adds documentation.

Remaining: Landyn and Ander review the proposal and confirm the actual Access admin destination and historical data sources. Implement the reporting card in a separate change after those dependencies are established. Automatic burn remains a separate decision. Existing unrelated local work was left untouched.
