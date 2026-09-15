import {
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type EcommerceOptions = BotmakerClientOptions & { api?: BotmakerClient };

function enc(value: string): string {
  return encodeURIComponent(value);
}

export function createEcommerce(options: EcommerceOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async listCatalogs() {
      return itemsOf(await api.request("GET", "/ecommerce/catalogs"));
    },
    createCatalog(body: unknown) {
      return api.request("POST", "/ecommerce/catalogs", { body });
    },
    connectPlatform(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/platform-integrations`,
        { body },
      );
    },
    disconnectPlatform(catalogId: string, platform: string) {
      return api.request(
        "DELETE",
        `/ecommerce/catalogs/${enc(catalogId)}/platform-integrations/${enc(platform)}`,
      );
    },
    syncPlatform(catalogId: string, platform: string) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/platform-integrations/${enc(platform)}/sync`,
      );
    },
    async listProducts(catalogId: string, query: Record<string, string | undefined> = {}) {
      return itemsOf(
        await api.request(
          "GET",
          `/ecommerce/catalogs/${enc(catalogId)}/products`,
          { query },
        ),
      );
    },
    getProduct(catalogId: string, sku: string) {
      return api.request(
        "GET",
        `/ecommerce/catalogs/${enc(catalogId)}/products/${enc(sku)}`,
      );
    },
    createProducts(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/products`,
        { body },
      );
    },
    deleteProduct(catalogId: string, sku: string) {
      return api.request(
        "DELETE",
        `/ecommerce/catalogs/${enc(catalogId)}/products/${enc(sku)}`,
      );
    },
    deleteProductsBatch(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/products/batch/delete`,
        { body },
      );
    },
    async listZones(catalogId: string) {
      return itemsOf(
        await api.request("GET", `/ecommerce/catalogs/${enc(catalogId)}/zones`),
      );
    },
    getZone(catalogId: string, zoneCode: string) {
      return api.request(
        "GET",
        `/ecommerce/catalogs/${enc(catalogId)}/zones/${enc(zoneCode)}`,
      );
    },
    upsertZones(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/zones`,
        { body },
      );
    },
    deleteZone(catalogId: string, zoneCode: string) {
      return api.request(
        "DELETE",
        `/ecommerce/catalogs/${enc(catalogId)}/zones/${enc(zoneCode)}`,
      );
    },
    deleteZonesBatch(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/zones/batch/delete`,
        { body },
      );
    },
    async listStores(catalogId: string) {
      return itemsOf(
        await api.request("GET", `/ecommerce/catalogs/${enc(catalogId)}/stores`),
      );
    },
    createStores(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/stores`,
        { body },
      );
    },
    deleteStore(catalogId: string, code: string) {
      return api.request(
        "DELETE",
        `/ecommerce/catalogs/${enc(catalogId)}/stores/${enc(code)}`,
      );
    },
    deleteStoresBatch(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/stores/batch/delete`,
        { body },
      );
    },
    async listCategories(catalogId: string) {
      return itemsOf(
        await api.request(
          "GET",
          `/ecommerce/catalogs/${enc(catalogId)}/categories`,
        ),
      );
    },
    createCategories(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/categories`,
        { body },
      );
    },
    deleteCategory(catalogId: string, categoryCode: string) {
      return api.request(
        "DELETE",
        `/ecommerce/catalogs/${enc(catalogId)}/categories/${enc(categoryCode)}`,
      );
    },
    async listPriceSchemas(catalogId: string) {
      return itemsOf(
        await api.request(
          "GET",
          `/ecommerce/catalogs/${enc(catalogId)}/price-schemas`,
        ),
      );
    },
    createPriceSchemas(catalogId: string, body: unknown) {
      return api.request(
        "POST",
        `/ecommerce/catalogs/${enc(catalogId)}/price-schemas`,
        { body },
      );
    },
    listPriceSchemasByZone(catalogId: string, zoneCode: string) {
      return api.request(
        "GET",
        `/ecommerce/catalogs/${enc(catalogId)}/price-schemas/${enc(zoneCode)}`,
      );
    },
    checkoutCart(body: unknown) {
      return api.request("POST", "/chats-actions/commerce/checkout-cart", {
        body,
      });
    },
    sendProductsMessage(body: unknown) {
      return api.request(
        "POST",
        "/chats-actions/commerce/send-products-message",
        { body },
      );
    },
    sendProducts(body: unknown) {
      return api.request("POST", "/chats-actions/send-products", { body });
    },
  };
}

export type EcommerceClient = ReturnType<typeof createEcommerce>;
