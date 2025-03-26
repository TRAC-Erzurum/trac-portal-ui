#!/bin/bash

set -e

echo "🚀 Building frontend..."
yarn install
yarn generate

echo "🚮 Removing existing public folder..."
rm -rf ../backend/public

echo "📦 Copying frontend build to backend/public..."
cp -r dist ../backend/public

echo "✅ Build completed successfully!"