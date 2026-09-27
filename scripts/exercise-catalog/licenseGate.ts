export type LicenseReviewStatus = "pending" | "approved" | "rejected";

export interface LicenseApproval {
  status: LicenseReviewStatus;
  approved: boolean;
  reviewer?: string;
  reviewedAt?: string;
}

export interface LicenseMetadata {
  licenseName?: string;
  licenseUrl?: string;
  licenseNotice?: string;
  attributionText?: string;
  review: LicenseApproval;
}

export function assertLicenseApproved(metadata: LicenseMetadata): void {
  if (!metadata.licenseName?.trim()) {
    throw new Error("License gate blocked import: licenseName is required.");
  }
  if (metadata.review.status !== "approved" || metadata.review.approved !== true) {
    throw new Error(
      `License gate blocked import: explicit approval is required (status=${metadata.review.status}, approved=${metadata.review.approved}). Review the source terms and set review.approved=true and review.status="approved".`,
    );
  }
  if (!metadata.review.reviewer?.trim() || !metadata.review.reviewedAt?.trim()) {
    throw new Error("License gate blocked import: approved reviews must include reviewer and reviewedAt.");
  }
}
