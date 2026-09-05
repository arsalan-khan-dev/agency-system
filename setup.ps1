cd apps\api
npm install
cd ..\web
npm install

cd ..\api
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
npx ts-node -T src/seed.ts
npx ts-node -T src/seed-pricing.ts

npx nest build
cd ..\web
npx next build
