#!/bin/bash
export TZ=Europe/Stockholm
export NODE_ENV=production
cd server
exec node src/index.js
