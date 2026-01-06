#!/bin/bash

if [ "$CF_PAGES_BRANCH" = "main" ]; then
  export VITE_API_URL="https://tabletennis.chamika.workers.dev/api"
else
  BRANCH_NAME="${CF_PAGES_BRANCH//\//-}"
  BRANCH_NAME="${BRANCH_NAME//_/-}"
  export VITE_API_URL="https://${BRANCH_NAME}-tabletennis.chamika.workers.dev/api"
fi
echo "VITE_API_URL=$VITE_API_URL"

npm install
npm run build
