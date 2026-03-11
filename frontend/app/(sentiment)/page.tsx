'use client';

import { AnalyzeContainer } from '@/components/analyze/AnalyzeContainer';
import { PageLayout } from '@/components/common/PageLayout';

export default function AnalyzePage() {
  return (
    <PageLayout title="Analyze a Review">
      <AnalyzeContainer />
    </PageLayout>
  );
}
