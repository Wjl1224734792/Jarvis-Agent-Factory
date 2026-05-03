import { systemPaths } from './system';
import { authPaths } from './auth';
import { adminAnalyticsPaths } from './admin-analytics';
import { adminReportsPaths } from './admin-reports';
import { socialPaths } from './social';
import { uploadPaths } from './uploads';
import { brandApplicationPaths } from './brand-applications';
import { submissionPaths } from './submissions';
import { catalogPaths } from './catalog';
import { settingsPaths } from './settings';
import { modelPaths } from './models';
import { reviewPaths } from './reviews';
import { postPaths } from './posts';
import { rankingPaths } from './rankings';

export const openApiPaths = {
  ...systemPaths,
  ...authPaths,
  ...adminAnalyticsPaths,
  ...adminReportsPaths,
  ...socialPaths,
  ...uploadPaths,
  ...brandApplicationPaths,
  ...submissionPaths,
  ...catalogPaths,
  ...settingsPaths,
  ...modelPaths,
  ...reviewPaths,
  ...postPaths,
  ...rankingPaths,
} as const;
