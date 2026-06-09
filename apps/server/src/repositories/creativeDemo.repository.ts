import {
  listActiveCreativeDemos,
  listCreativeDemoTitles,
  loadCreativeDemos,
} from "../services/creative/creative.js";

export { loadCreativeDemos, listActiveCreativeDemos, listCreativeDemoTitles };

export type CreativeDemoRow = {
  id?: string;
  title?: string;
  size?: string | string[];
  value?: string;
  category?: string;
  file?: string;
  fileType?: string;
  status?: string;
};
