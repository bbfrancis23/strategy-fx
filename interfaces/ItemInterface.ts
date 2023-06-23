import { Section } from './SectionInterface';
import { Tag } from './TagInterface';

export interface Item {
  title: string;
  sections?: Section[];
  upvotes?: string[];
  downvotes?: string[];
  rating?: number;
  id: string;
}
