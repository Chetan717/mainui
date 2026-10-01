import logoData from "../data/logolocalcdn.json";

export function getLocalLogo(companyId) {
  if (!companyId) return null;
  const company = logoData?.find((item) => item.ID === `${companyId}`);
  if (!company) return null;
  return company?.logos || null;
}

const asLogoList = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getLogoLink = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value.link === "string") return value.link.trim();
  return "";
};

export function getCompanyLogoUrl(company, preferredSize = "square") {
  if (!company) return "";

  const candidates = [
    ...asLogoList(getLocalLogo(company.id)),
    ...asLogoList(company.logos),
    company.logoURL,
    company.logoUrl,
    company.logo,
  ].filter((item) => getLogoLink(item));

  const preferred = candidates?.find(
    (item) =>
      typeof item === "object" &&
      item?.index === 0,
      
  );

  return getLogoLink(preferred || candidates[0]);
}
