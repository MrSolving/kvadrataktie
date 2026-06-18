#!/bin/bash
export TZ=Europe/Stockholm
export NODE_ENV=production
exec node server/src/index.js
