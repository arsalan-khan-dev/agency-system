import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Quotation } from './quotation.entity';

// Client-facing line item. Deliberately carries only a description and
// hours — no per-item internal cost/margin. See MEMORY.md Section 05.
@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quotation, (quotation) => quotation.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ type: 'varchar', length: 150 })
  description: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hours: string;
}
