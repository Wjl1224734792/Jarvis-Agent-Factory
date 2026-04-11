import { searchAdminContent } from "./admin-search.service";
import { searchSiteContent } from "./site-search.service";

export const searchService = {
  searchSite: searchSiteContent,
  searchAdmin: searchAdminContent
};
