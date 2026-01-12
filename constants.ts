
import { NoticeType, RuleResponse } from './types';

// Deterministic texts for Clause (a) and (c) are handled by logic in TrustReplyApp,
// but these defaults represent Scenario 1 (Most common).

export const RULE_12A_DEFAULTS: RuleResponse[] = [
  { id: '12a_a', rule: 'a', label: 'Instrument creating trust', text: 'The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '12a_b', rule: 'b', label: 'Creation Document (if no instrument)', text: 'The applicant trust has been created and established under a written Trust Deed.', isApplicable: true },
  { id: '12a_c', rule: 'c', label: 'Registration with Registrar', text: 'The applicant trust is duly registered with the Office of the Charity Commissioner. A self-certified copy of the Public Trust Registration Certificate (PTR) has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '12a_d', rule: 'd', label: 'FCRA 2010 Registration', text: 'The applicant trust is not registered under the Foreign Contribution (Regulation) Act, 2010. Accordingly, the provisions of Rule 17A(2)(d) are not applicable.', isApplicable: true },
  { id: '12a_e', rule: 'e', label: 'Existing Registration Order', text: 'The applicant trust was earlier granted registration under section 12A / 12AA / 12AB of the Income-tax Act, 1961. A self-certified copy of the earlier registration order has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '12a_f', rule: 'f', label: 'Order of Rejection (if any)', text: 'No order rejecting any earlier application for registration under section 12A / 12AA / 12AB of the Income-tax Act, 1961 has been passed in the case of the applicant trust.', isApplicable: true },
  { id: '12a_g', rule: 'g', label: 'Annual Accounts (Last 3 Years)', text: 'The applicant trust has duly furnished the annual accounts, including the Income and Expenditure Account and Balance Sheet, for the last three financial years, as applicable. Self-certified copies of the said annual accounts have already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '12a_h', rule: 'h', label: 'Business Undertaking Accounts', text: 'The applicant trust does not hold any business undertaking within the meaning of section 11(4) of the Income-tax Act, 1961. Accordingly, the provisions of Rule 17A(2)(h) are not applicable.', isApplicable: true },
  { id: '12a_i', rule: 'i', label: 'Business Profits Accounts', text: 'The applicant trust does not carry on any business activity whose income is claimed as exempt under section 11(4A) of the Income-tax Act, 1961. Accordingly, the provisions of Rule 17A(2)(i) are not applicable.', isApplicable: true },
  { id: '12a_j', rule: 'j', label: 'Documents for Modification of Objects', text: 'There has been no modification in the objects of the applicant trust since its creation. Accordingly, the provisions of Rule 17A(2)(j) are not applicable.', isApplicable: true },
  { id: '12a_k', rule: 'k', label: 'Note on activities of applicant', text: 'The applicant trust submits a note on the charitable activities carried out during the last three financial years. The trust has been actively engaged in carrying out charitable activities strictly in accordance with its stated objects as per the Trust Deed / governing documents. Activity-wise details along with the expenditure incurred thereon have been furnished.', isApplicable: true },
];

export const RULE_80G_DEFAULTS: RuleResponse[] = [
  { id: '80g_a', rule: 'a', label: 'Instrument creating trust', text: 'The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '80g_b', rule: 'b', label: 'Registration with Registrar', text: 'The applicant trust is duly registered with the Office of the Charity Commissioner. A self-certified copy of the Public Trust Registration Certificate (PTR) has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '80g_c', rule: 'c', label: 'Objects Conformity', text: 'The objects of the applicant trust are charitable in nature and are in conformity with the provisions of section 80G(5) of the Income-tax Act, 1961.', isApplicable: true },
  { id: '80g_d', rule: 'd', label: 'Religious/Caste Benefit Clause', text: 'The applicant trust is not established for the benefit of any particular religious community or caste, and its income and assets are applied solely towards the attainment of its charitable objects.', isApplicable: true },
  { id: '80g_e', rule: 'e', label: 'Books of Account Maintenance', text: 'The applicant trust regularly maintains proper books of account in respect of its income and expenditure.', isApplicable: true },
  { id: '80g_f', rule: 'f', label: 'Dissolution Clause', text: 'The governing documents provide that, upon dissolution or winding up, the assets shall be applied solely for charitable purposes and shall not be distributed to any trustee or member.', isApplicable: true },
  { id: '80g_g', rule: 'g', label: 'Existing Approval Order', text: 'The applicant trust was earlier granted approval under section 80G. A self-certified copy of the earlier approval order has already been duly uploaded along with Form No. 10AB.', isApplicable: true },
  { id: '80g_h', rule: 'h', label: 'Note on activities of applicant', text: 'The applicant trust submits a note on the charitable activities carried out during the last three financial years. Supporting documentary evidence such as annual accounts and activity reports have been duly uploaded.', isApplicable: true },
];
