if [ "$CF_PAGES_BRANCH" = "main" ]; then
  export VITE_API_URL="https://tabletennis.chamika.workers.dev/api"
else
  export VITE_API_URL="https://${CF_PAGES_BRANCH//\//-}-tabletennis.chamika.workers.dev/api"
fi
echo "VITE_API_URL=$VITE_API_URL"

npm install
npm run build
