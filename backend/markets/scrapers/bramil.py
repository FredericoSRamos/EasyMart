from .vip_base import VIPCommerceScraper

class BramilScraper(VIPCommerceScraper):
    API_BASE = "https://services-beta.vipcommerce.com.br/api-admin/v1"
    ORG_ID = 53
    DOMAIN_KEY = "bramilemcasa.com.br"
    FILIAL_ID = 1
    DIST_ID = 23
    MARKET_NAME = "Bramil Supermercados"
    MARKET_SLUG = "bramil"
    
    DEPARTMENTS = [
        "Bebidas", "Carnes", "Cereais e farinaceos", "Mercearia", 
        "Matinais e sobremesas", "Biscoitos e chocolates", "Congelados", 
        "Hortifruti", "Frios e laticinios", "Perfumaria e higiene", 
        "Limpeza", "Animais", "Bazar e utilidades", "Construmil", "Cesta básica"
    ]
