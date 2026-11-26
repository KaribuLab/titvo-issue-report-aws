import { defineConfig } from 'turbowatch';

export default defineConfig({
  project: __dirname,
  triggers: [
    {
      expression: [
        'allof',
        ['not', ['match', 'node_modules', 'basename']],
        ['not', ['match', 'dist', 'basename']],
        ['not', ['match', 'build', 'basename']],
        ['anyof', ['match', '*.ts', 'basename'], ['match', 'src/**', 'wholename']],
      ],
      name: 'build-and-deploy',
      initialRun: true,
      interruptible: false,
      onChange: async ({ spawn }) => {
        try {
          await spawn`echo "Installing dependencies..."`;
          await spawn`npm install`;

          await spawn`echo "Building lambda..."`;
          await spawn`rm -rf dist build`;
          await spawn`rspack build`;

          await spawn`echo "Deploying to MiniStack..."`;
          await spawn`terragrunt run --all --working-dir aws --backend-bootstrap apply -- -auto-approve`;

          await spawn`echo "Deployment completed successfully!"`;
        } catch (error) {
          console.error('Error during build and deploy:', error);
        }
      },
    },
  ],
});