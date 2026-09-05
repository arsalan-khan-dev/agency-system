import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Quotation } from '../../quotation/entities/quotation.entity';
import { User } from '../../identity/entities/user.entity';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

// A Change Request records a scope change on a RUNNING project (client
// wants to add/remove/adjust work after the project already started from
// an accepted quotation). See MEMORY.md Section 04/19: "New quotation
// version on change."
//
// Design decision, confirmed with the person (MEMORY.md Section 04/44
// update — this was previously an unconfirmed assumption, now resolved):
// approving a change request creates a new quotation version (same
// quotationGroupId as the project's original quotation, following the
// existing ADR-005 versioning pattern) with status set to plain 'draft' —
// it MUST go back through the normal send → client-accept cycle (internal
// accept or the public acceptance link) like any other quotation. The
// project's own quotation link / budget snapshot only change once that
// specific version is actually accepted (see
// QuotationService.acceptCore), never at approval time. "Approve" here
// means staff agree the change is worth quoting, not that the client has
// signed off yet.
@Entity('change_requests')
export class ChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Additional (or reduced, if negative) hours this change represents.
  // Recorded as its own quotation line item on approval — never blended
  // into an existing item, so the change stays independently auditable.
  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hoursDelta: string;

  // Additional (or reduced, if negative) price in cents. Applied on top
  // of the project's CURRENT quotation version price, not the original
  // v1 price, so stacked change requests compound correctly.
  @Column({ type: 'integer' })
  priceDeltaCents: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ChangeRequestStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolvedBy: User | null;

  // Set only when status becomes 'approved' — the new quotation version
  // this change request produced. Null while pending or if rejected.
  @ManyToOne(() => Quotation, { nullable: true })
  @JoinColumn({ name: 'resulting_quotation_id' })
  resultingQuotation: Quotation | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
