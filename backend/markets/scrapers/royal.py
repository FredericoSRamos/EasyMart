from .vip_base import VIPCommerceScraper

class RoyalScraper(VIPCommerceScraper):
    API_BASE = "https://services.vipcommerce.com.br/api-admin/v1"
    ORG_ID = 255
    DOMAIN_KEY = "royaleemporio.com.br"
    FILIAL_ID = 2
    DIST_ID = 1
    MARKET_NAME = "Royal Supermercados"
    MARKET_SLUG = "royal"
    IMAGE_CDN = "https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/250x250/"
    
    DEPARTMENTS = [
        "Bebidas", "Mercearia", "Matinais e sobremesas", "Biscoitos e chocolates", 
        "Cereais e farináceos", "Limpeza", "Perfumaria e higiene", "Animais", 
        "Congelados", "Bazar e utilidades", "Frios e laticínios", "Padaria", 
        "Carnes", "Hortifruti"
    ]
