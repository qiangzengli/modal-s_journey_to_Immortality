import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {loadEnvFile} from 'node:process';

// Configuration and saves belong to the application, independently of its source directory.
// Existing installations keep using their one original save until explicitly moved.
export function runtimePaths(projectRoot,{env=process.env,exists=existsSync}={}) {
  const primarySave=join(projectRoot,'.data','save.json');
  const previousSave=join(projectRoot,'mvp','.data','save.json');
  const primaryEnv=join(projectRoot,'.env.local');
  const previousEnv=join(projectRoot,'mvp','.env.local');
  return {
    savePath:env.SAVE_PATH?resolve(env.SAVE_PATH):exists(primarySave)||!exists(previousSave)?primarySave:previousSave,
    envPath:exists(primaryEnv)?primaryEnv:exists(previousEnv)?previousEnv:null
  };
}
export function loadGameEnvironment(projectRoot) {
  const {envPath}=runtimePaths(projectRoot);
  if(envPath)loadEnvFile(envPath); // Existing process variables take precedence.
}
