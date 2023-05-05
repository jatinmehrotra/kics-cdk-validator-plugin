import * as fs from 'fs';
import * as path from 'path';
import {
  App,
  Stack,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { KicsValidator, QueryCategory, Severity } from '../src/plugin';


beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
describe('KicsValidator', () => {
  test('synth fails', () => {
    // GIVEN
    const app = new App({
      policyValidationBeta1: [
        new KicsValidator(),
      ],
      context: {
        '@aws-cdk/core:validationReportJson': true,
      },
    });

    // WHEN
    const stack = new Stack(app, 'Stack');
    new s3.Bucket(stack, 'Bucket');

    // THEN
    expect(() => {
      app.synth();
    }).toThrow();
    const report = fs.readFileSync(path.join(app.outdir, 'policy-validation-report.json')).toString('utf-8').trim();
    const jsonReport = JSON.parse(report);
    const rules = jsonReport.pluginReports.flatMap((r: any) => r.violations.flatMap((v: any) => v.ruleName));
    expect(rules).toEqual(expect.arrayContaining([
      'S3 Bucket Without SSL In Write Actions',
      'S3 Bucket Without Server-side-encryption',
      'S3 Bucket Should Have Bucket Policy',
    ]));
  });
  test('synth succeeds', () => {
    // GIVEN
    const app = new App({
      policyValidationBeta1: [
        new KicsValidator({
          excludeQueries: [
            '64ab651b-f5b2-4af0-8c89-ddd03c4d0e61',
            'b2e8752c-3497-4255-98d2-e4ae5b46bbf5',
            '38c64e76-c71e-4d92-a337-60174d1de1c9',
          ],
          excludeCategories: [
            QueryCategory.OBSERVABILITY,
          ],
          excludeSeverities: [
            Severity.MEDIUM,
          ],
        }),
      ],
      context: {
        '@aws-cdk/core:validationReportJson': true,
      },
    });

    // WHEN
    const stack = new Stack(app, 'Stack');
    new s3.Bucket(stack, 'Bucket', {
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
    });

    // THEN
    expect(() => {
      app.synth();
    }).not.toThrow(/Validation failed. See the validation report above for details/);
  });
});
