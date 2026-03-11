'use client';

import { ReviewContainer } from '@/components/review/ReviewContainer';
import { PageLayout } from '@/components/common/PageLayout';

export default function ReviewsPage() {
  return (
    <PageLayout title="Analyzed Reviews">
      <ReviewContainer />
    </PageLayout>
  );
}
