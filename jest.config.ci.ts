import type {Config} from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    reporters: [
        ['github-actions', {silent: false}],
        'summary'
    ]
};
export default config;