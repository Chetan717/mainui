export const COMPANY_BATCH_SIZE = 14;

export function normalizeCompanySearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export function filterCompaniesByName(companies, search) {
  const query = normalizeCompanySearch(search);
  if (!query) return companies;
  return companies.filter((company) =>
    (company.searchKey || normalizeCompanySearch(company.name)).includes(query),
  );
}

export function getCompanyBatch(companies, visibleCount) {
  return companies.slice(0, Math.max(0, visibleCount));
}

export function getNextCompanyCount(
  currentCount,
  totalCount,
  batchSize = COMPANY_BATCH_SIZE,
) {
  return Math.min(totalCount, Math.max(0, currentCount) + batchSize);
}
