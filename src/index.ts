#!/usr/bin/env node

import {createCli} from "./cli";

const cli = createCli();
cli.parse();