export set VITE_API_URL="https://$CF_PAGES_BRANCH-tabletennis.chamika.workers.dev/api" 
echo "VITE_API_URL=$VITE_API_URL"

npm install
npm run build
