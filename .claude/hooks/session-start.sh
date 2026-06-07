#!/bin/bash
# SessionStart hook: emits a reminder at the start of every session so the
# assistant prompts the user about wiring up permanent automatic deployment.
#
# Background: the Netlify site "grammar-quest-pet" has NO continuous deployment.
# It is still internally linked to the old "AI_training" repo, so every fix has
# to be deployed manually. Rebinding it to this repo (grammar_learning_for_kids)
# would make every push to main auto-deploy.
set -euo pipefail

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"REMINDER FOR THE ASSISTANT: At the start of this session, ask the user whether they are now ready to rebind the Netlify site 'grammar-quest-pet' to the 'grammar_learning_for_kids' GitHub repo for permanent automatic deployment. Context to share if asked: the site currently has NO continuous deployment (it is still internally linked to the old 'AI_training' repo), so every fix must be deployed manually. The clean fix is, on a DESKTOP browser (mobile GitHub OAuth tends to crash): app.netlify.com -> project grammar-quest-pet -> Site configuration -> Build & deploy -> Continuous deployment -> Link repository -> GitHub -> rance811-maker/grammar_learning_for_kids; set Branch=main, Build command=EMPTY, Publish directory='.'. After that, every push to main auto-deploys. If the user is not ready or prefers not to, drop it for this session."}}
JSON
