const path = require('path');

module.exports = {
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'client/js'),
    },
    target: 'node-webkit', // Best match for CEP (Node + DOM)
    mode: 'development', // Easier debugging initially
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.json']
    },
    // Don't mock these, they exist in CEP
    externals: {
        'fs': 'commonjs fs',
        'path': 'commonjs path',
        'child_process': 'commonjs child_process',
        'os': 'commonjs os'
    }
};
