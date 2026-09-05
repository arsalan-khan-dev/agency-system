import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Quotation } from '../../quotation/entities/quotation.entity';

export type EmailLogStatus = 'queued';

// Phase 2 task 4 — email delivery is LOGGED/QUEUED ONLY in this sandbox,
// not actually sent. Explicitly scoped this way with the person: real SMTP
// send needs real credentials and belongs in a production environment, not
// this sandbox. Every email the app "would have sent" is written here so
// the content, recipient, and timing are all inspectable and testable —
// this is the honest, verifiable version of the feature that's actually
// buildable here, not a stub that silently does nothing.
@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => Quotation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedQuotationId' })
  relatedQuotation: Quotation | null;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: EmailLogStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
