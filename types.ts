
export enum TrustType {
  TRUST = 'Trust',
  WAQF = 'Waqf'
}

export enum NoticeType {
  RULE_11AA = 'Rule 11AA (80G)',
  RULE_17A = 'Rule 17A (12A)'
}

export enum RegistrationAuthority {
  CHARITY_COMMISSIONER = 'Charity Commissioner',
  REGISTRAR_OF_COMPANIES = 'Registrar of Companies',
  WAQF_BOARD = 'Waqf Board'
}

export enum CreationDocument {
  TRUST_DEED = 'Trust Deed Exists',
  NO_TRUST_DEED = 'No Trust Deed (Use PTR)',
  WAQF_DOCUMENT = 'Waqf Board Document'
}

export interface ActivityDetail {
  id: string;
  year: string;
  activity: string;
  expenditure: string;
}

export interface RuleResponse {
  id: string;
  rule: string;
  label: string;
  text: string;
  isApplicable: boolean;
}

export interface NoticeDetails {
  trustName: string;
  pan: string;
  din: string;
  date: string;
  noticeType: NoticeType;
  trustType: TrustType;
  registrationAuthority: RegistrationAuthority;
  creationDocument: CreationDocument;
  csrReceived: boolean;
  activities: ActivityDetail[];
  ruleResponses: RuleResponse[];
}
