#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Infinity Delivery — database seeder.
Builds a fully-populated SQLite database for the Chilakaluripet groceries app.
Run:  python3 seed.py
"""
import os, sqlite3, random, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DB   = os.path.join(HERE, "infinity.db")

random.seed(42)
TODAY = "2026-09-01"

def conn():
    if os.path.exists(DB):
        os.remove(DB)
    c = sqlite3.connect(DB)
    c.execute("PRAGMA foreign_keys = ON")
    return c

# ===========================================================================
#  CATEGORIES  (name, telugu, slug, icon, sort)
# ===========================================================================
CATEGORIES = [
    ("Fruits & Vegetables", "ఫ్రూట్స్ & వేజ్‌టబుల్స్", "fruits-vegetables", "🥦", 1),
    ("Rice & Staples",      "అరిసి & ధాన్యాలు",      "rice-staples",        "🍚", 2),
    ("Pulses & Dals",       "పప్పులు & దాళ్ళు",        "pulses-dals",         "🫘", 3),
    ("Oils & Ghee",         "తెల్లు & నెయ్యి",          "oils-ghee",           "🫗", 4),
    ("Dairy & Eggs",        "డెయిరీ & గుడ్లు",          "dairy-eggs",          "🥛", 5),
    ("Snacks & Beverages",  "స్నాక్స్ & పానీయాలు",       "snacks-beverages",    "🍪", 6),
    ("Household & Care",    "హౌస్‌హోల్డ్ & కేర్",       "household-care",      "🧴", 7),
    ("Baby & Health",       "బేబీ & హెల్త్",           "baby-health",         "🍼", 8),
    ("Fresh Bakery & Sweets","ఫ్రెష్ బేకరీ & మిఠాయిలు", "bakery-sweets",       "🍞", 9),
    ("Bulk / B2B",          "బల్క్ / వ్యాపారం",          "bulk-b2b",            "📦", 10),
]

# ===========================================================================
#  PRODUCTS  (name, telugu, category_slug, brand, unit, unit_qty, price, mrp,
#             mandi_price, stock, image, is_fresh, is_best_seller)
#  Prices in INR. mandi_price set for fresh produce (APMC benchmark).
# ===========================================================================
P = []
_CAT_ALIAS = {}
def add(name, te, cat, brand, unit, qty, price, mrp, mandi, stock, img, fresh=0, best=0):
    P.append((name, te, _CAT_ALIAS.get(cat, cat), brand, unit, qty, price, mrp, mandi, stock, img, fresh, best))

# ---- Fruits & Vegetables (farm-fresh, mandi-sourced) ----
FV = "fruits-vegetables"
_CAT_ALIAS["FV"] = FV
add("Tomato (1 kg)","టమాటో (1 కిలో)",FV,"Local Mandi","1 kg",1,32,40,28,500,"🍅",1,1)
add("Onion (1 kg)","ఉల్లిపాయ (1 కిలో)",FV,"Local Mandi","1 kg",1,38,48,34,600,"🧅",1,1)
add("Potato (1 kg)","బంగాళాదుంప (1 కిలో)",FV,"Local Mandi","1 kg",1,28,36,24,600,"🥔",1,1)
add("Ginger (200 g)","అల్లం (200 గ్రా)",FV,"Local Mandi","200 g",1,24,30,20,300,"🫚",1,0)
add("Garlic (100 g)","రసము (100 గ్రా)",FV,"Local Mandi","100 g",1,22,30,18,300,"🧄",1,0)
add("Green Chilli (100 g)","పచ్చి మిర్చి (100 గ్రా)",FV,"Local Mandi","100 g",1,12,18,10,400,"🌶️",1,0)
add("Coriander (100 g)","కొత్తిమీన (100 గ్రా)",FV,"Local Mandi","100 g",1,14,20,12,250,"🌿",1,0)
add("Cucumber (2 pcs)","కొత్తిమీర (2)","FV","Local Mandi","2 pc",1,24,32,20,300,"🥒",1,0)
add("Cabbage (1 pc)","కాలంబో (1)","FV","Local Mandi","1 pc",1,22,30,18,250,"🥬",1,0)
add("Carrot (500 g)","గజ్జరం (500 గ్రా)",FV,"Local Mandi","500 g",1,28,36,24,300,"🥕",1,0)
add("Beetroot (500 g)","బీట్‌రూట్ (500 గ్రా)",FV,"Local Mandi","500 g",1,26,34,22,250,"🟣",1,0)
add("Brinjal (1 kg)","బంగాళాదుంప (1 కిలో)",FV,"Local Mandi","1 kg",1,30,40,26,300,"🍆",1,0)
add("Okra / Bhendi (500 g)","బెండీ (500 గ్రా)",FV,"Local Mandi","500 g",1,24,32,20,300,"🌶️",1,0)
add("Bottle Gourd (1 pc)","బురద (1)","FV","Local Mandi","1 pc",1,20,28,16,250,"🥒",1,0)
add("Pumpkin (1 kg)","కడుపు (1 కిలో)",FV,"Local Mandi","1 kg",1,22,30,18,250,"🎃",1,0)
add("Sweet Potato (1 kg)","బంగాళాదుంప (1 కిలో)",FV,"Local Mandi","1 kg",1,26,34,22,250,"🍠",1,0)
add("Gongura (200 g)","గోంగూర (200 గ్రా)",FV,"Local Farm","200 g",1,18,25,14,200,"🌿",1,1)
add("Drumstick (10 pcs)","ఆవంక (10)",FV,"Local Farm","10 pc",1,30,40,25,200,"🥢",1,0)
add("Banana (1 dozen)","బనాన (1 డజన్)",FV,"Local Mandi","12 pc",1,45,60,40,400,"🍌",1,1)
add("Mango (1 kg)","అవకాడో (1 కిలో)",FV,"Local Mandi","1 kg",1,60,80,50,300,"🥭",1,0)
add("Watermelon (1 pc)","దోసకాయ (1)","FV","Local Mandi","1 pc",1,40,55,35,200,"🍉",1,0)
add("Papaya (1 pc)","పాపియ (1)","FV","Local Mandi","1 pc",1,35,50,30,200,"🧡",1,0)
add("Pomegranate (500 g)","ఆంజూరు (500 గ్రా)",FV,"Local Mandi","500 g",1,80,110,70,200,"🔴",1,0)
add("Apple (1 kg)","ఆపిల్ (1 కిలో)",FV,"Shimla","1 kg",1,120,150,100,300,"🍎",1,0)
add("Orange (1 kg)","నారింజ (1 కిలో)",FV,"Local Mandi","1 kg",1,60,80,50,300,"🍊",1,0)
add("Pineapple (1 pc)","అనానాస్ (1)","FV","Local Mandi","1 pc",1,50,70,45,150,"🍍",1,0)
add("Grapes (500 g)","అంగూరు (500 గ్రా)",FV,"Local Mandi","500 g",1,60,80,55,200,"🍇",1,0)
add("Custard Apple (500 g)","సబ్జ (500 గ్రా)",FV,"Local Mandi","500 g",1,90,120,80,150,"🍈",1,0)
add("Lemon (4 pcs)","నిమ్మ (4)","FV","Local Mandi","4 pc",1,20,28,16,300,"🍋",1,0)
add("Coconut (2 pcs)","కొబ్బరి (2)","FV","Local Mandi","2 pc",1,35,45,30,300,"🥥",1,0)

# ---- Rice & Staples ----
RS = "rice-staples"
_CAT_ALIAS["RS"] = RS
add("Sona Masoori Rice (5 kg)","సోనా మసూరి (5 కిలో)",RS,"Sri Laxmi","5 kg",1,480,520,440,200,"🍚",0,1)
add("Sona Masoori Rice (10 kg)","సోనా మసూరి (10 కిలో)",RS,"Sri Laxmi","10 kg",1,940,1020,860,150,"🍚",0,1)
add("HMT Basmati Rice (1 kg)","HMT బస్మతి (1 కిలో)",RS,"HMT","1 kg",1,120,140,100,200,"🍚",0,0)
add("HMT Basmati Rice (5 kg)","HMT బస్మతి (5 కిలో)",RS,"HMT","5 kg",1,560,640,500,120,"🍚",0,0)
add("Local Dhanak Rice (5 kg)","దానాక అరిసి (5 కిలో)",RS,"Local Mandi","5 kg",1,420,480,380,150,"🍚",1,0)
add("Idli Rava (1 kg)","ఇడ్లీ రవ (1 కిలో)",RS,"Sri Laxmi","1 kg",1,60,70,55,200,"🥣",0,0)
add("Upma Rava (1 kg)","ఉపమ రవ (1 కిలో)",RS,"Sri Laxmi","1 kg",1,55,65,50,200,"🥣",0,0)
add("Wheat Flour / Atta (1 kg)","గోధుమ అటా (1 కిలో)",RS,"Aashirvaad","1 kg",1,48,55,44,250,"🌾",0,0)
add("Wheat Flour / Atta (5 kg)","గోధుమ అటా (5 కిలో)",RS,"Aashirvaad","5 kg",1,230,260,210,150,"🌾",0,0)
add("Maida (1 kg)","మైదా (1 కిలో)",RS,"Aashirvaad","1 kg",1,45,52,42,200,"🌾",0,0)
add("Besan (500 g)","బెసన్ (500 గ్రా)",RS,"Local Mandi","500 g",1,42,50,38,150,"🥣",0,0)
add("Moong Dal Flour (250 g)","మొక్కా పిండి (250 గ్రా)",RS,"Local Mandi","250 g",1,35,42,30,150,"🥣",0,0)
add("Rice Flour (1 kg)","అరిసి పిండి (1 కిలో)",RS,"Local Mandi","1 kg",1,55,65,50,150,"🥣",0,0)
add("Suji / Rava (500 g)","సూజీ (500 గ్రా)",RS,"Aashirvaad","500 g",1,40,48,36,150,"🥣",0,0)

# ---- Pulses & Dals ----
PD = "pulses-dals"
_CAT_ALIAS["PD"] = PD
add("Toor Dal (500 g)","తుర్రు పప్పు (500 గ్రా)",PD,"Local Mandi","500 g",1,78,90,70,250,"🫘",0,1)
add("Toor Dal (1 kg)","తుర్రు పప్పు (1 కిలో)",PD,"Local Mandi","1 kg",1,150,175,135,200,"🫘",0,1)
add("Urad Dal (500 g)","ఉరద పప్పు (500 గ్రా)",PD,"Local Mandi","500 g",1,82,95,74,250,"🫘",0,0)
add("Moong Dal (500 g)","మొక్క పప్పు (500 గ్రా)",PD,"Local Mandi","500 g",1,85,100,78,200,"🫘",0,0)
add("Chana Dal (500 g)","చన పప్పు (500 గ్రా)",PD,"Local Mandi","500 g",1,65,78,58,250,"🫘",0,0)
add("Masoor Dal (500 g)","మసూర్ పప్పు (500 గ్రా)",PD,"Local Mandi","500 g",1,70,85,62,200,"🫘",0,0)
add("Khesari Dal (250 g)","ఖేసరి పప్పు (250 గ్రా)",PD,"Local Mandi","250 g",1,35,42,30,150,"🫘",0,0)
add("Black Chana (500 g)","నల్ల చన (500 గ్రా)",PD,"Local Mandi","500 g",1,72,85,65,200,"🫘",0,0)
add("Red Chana (500 g)","పసుపు చన (500 గ్రా)",PD,"Local Mandi","500 g",1,68,80,60,200,"🫘",0,0)
add("Soyabean (500 g)","సోయాబీన్ (500 గ్రా)",PD,"Local Mandi","500 g",1,55,65,50,200,"🫘",0,0)
add("Rajma (500 g)","రజ్మా (500 గ్రా)",PD,"Local Mandi","500 g",1,95,115,85,150,"🫘",0,0)
add("Kabuli Chana (500 g)","కబూలి చన (500 గ్రా)",PD,"Local Mandi","500 g",1,110,130,98,150,"🫘",0,0)

# ---- Oils & Ghee ----
OG = "oils-ghee"
_CAT_ALIAS["OG"] = OG
add("Sunflower Oil (1 L)","సన్‌ఫ్లవర్ ఆయిల్ (1 లి)",OG,"Sri Kanaka","1 L",1,150,170,140,300,"🫗",0,1)
add("Sunflower Oil (5 L)","సన్‌ఫ్లవర్ ఆయిల్ (5 లి)",OG,"Sri Kanaka","5 L",1,720,820,680,150,"🫗",0,0)
add("Groundnut Oil (1 L)","వెన్నెల పప్పు నూనె (1 లి)",OG,"Sri Kanaka","1 L",1,190,220,175,200,"🫗",0,0)
add("Groundnut Oil (5 L)","వెన్నెల పప్పు నూనె (5 లి)",OG,"Sri Kanaka","5 L",1,900,1050,850,100,"🫗",0,0)
add("Mustard Oil (1 L)","పసుపు నూనె (1 లి)",OG,"Sri Kanaka","1 L",1,160,185,150,200,"🫗",0,0)
add("Rice Bran Oil (1 L)","అరిసి బ్రాన్ ఆయిల్ (1 లి)",OG,"Sri Kanaka","1 L",1,140,160,130,200,"🫗",0,0)
add("Pure Ghee (500 ml)","శుద్ధ నెయ్యి (500 మిలీ)",OG,"Amul","500 ml",1,320,360,300,150,"🧈",0,1)
add("Pure Ghee (1 L)","శుద్ధ నెయ్యి (1 లి)",OG,"Amul","1 L",1,620,700,580,100,"🧈",0,0)
add("Vanaspati / Dalda (500 g)","వనస్పతి (500 గ్రా)",OG,"Dalda","500 g",1,95,110,88,200,"🧈",0,0)

# ---- Dairy & Eggs ----
DE = "dairy-eggs"
_CAT_ALIAS["DE"] = DE
add("Toned Milk (500 ml)","టోన్ పాలు (500 మిలీ)",DE,"Nandini","500 ml",1,27,30,25,400,"🥛",0,1)
add("Toned Milk (1 L)","టోన్ పాలు (1 లి)",DE,"Nandini","1 L",1,50,55,48,350,"🥛",0,1)
add("Full Cream Milk (500 ml)","ఫుల్ క్రీమ్ పాలు (500 మిలీ)",DE,"Nandini","500 ml",1,32,36,30,300,"🥛",0,0)
add("Full Cream Milk (1 L)","ఫుల్ క్రీమ్ పాలు (1 లి)",DE,"Nandini","1 L",1,60,68,56,250,"🥛",0,0)
add("Curd / Dahi (400 g)","కొల్ల (400 గ్రా)",DE,"Nandini","400 g",1,30,35,28,300,"🥛",0,0)
add("Butter (100 g)","బటర్ (100 గ్రా)",DE,"Amul","100 g",1,58,65,55,200,"🧈",0,0)
add("Paneer (200 g)","పనీర్ (200 గ్రా)",DE,"Nandini","200 g",1,90,110,82,150,"🧀",0,0)
add("Cheese Slices (100 g)","చీజ్ స్లైసెస్ (100 గ్రా)",DE,"Amul","100 g",1,60,70,55,150,"🧀",0,0)
add("Eggs (12 pcs)","గుడ్లు (12)",DE,"Farm Fresh","12 pc",1,85,95,80,400,"🥚",1,1)
add("Eggs (30 pcs)","గుడ్లు (30)",DE,"Farm Fresh","30 pc",1,195,220,180,200,"🥚",1,0)
add("Buttermilk (500 ml)","చెల్ల (500 మిలీ)",DE,"Nandini","500 ml",1,25,30,22,200,"🥛",0,0)
add("Milk Powder (500 g)","పాలిండ్ (500 గ్రా)",DE,"Nestle","500 g",1,280,320,260,150,"🥛",0,0)

# ---- Snacks & Beverages ----
SB = "snacks-beverages"
_CAT_ALIAS["SB"] = SB
add("Parle-G Biscuits (300 g)","పార్లె-జి (300 గ్రా)",SB,"Parle","300 g",1,35,40,32,400,"🍪",0,1)
add("Marie Gold (300 g)","మేరీ గోల్డ్ (300 గ్రా)",SB,"Britannia","300 g",1,38,45,35,300,"🍪",0,0)
add("Rusk (200 g)","రస్క్ (200 గ్రా)",SB,"Britannia","200 g",1,40,48,36,250,"🍪",0,0)
add("Chips - Lay's (70 g)","లెయిస్ చిప్స్ (70 గ్రా)",SB,"Lay's","70 g",1,20,25,18,400,"🍟",0,1)
add("Namkeen Mixture (200 g)","నామకేన్ మిశ్రమం (200 గ్రా)",SB,"Local","200 g",1,45,55,40,250,"🥜",0,0)
add("Roasted Peanuts (200 g)","వెన్నెల పప్పు (200 గ్రా)",SB,"Local Mandi","200 g",1,35,45,30,300,"🥜",1,0)
add("Green Tea (25 bags)","గ్రీన్ టీ (25 బ్యాగ్స్)",SB,"Tata","25 pc",1,120,140,110,200,"🍵",0,0)
add("Filter Coffee (100 g)","ఫిల్టర్ కాఫీ (100 గ్రా)",SB,"Local Roast","100 g",1,95,120,85,200,"☕",0,1)
add("Tea Leaves - CTC (250 g)","చాయ CTC (250 గ్రా)",SB,"Tata","250 g",1,110,130,100,250,"🍵",0,0)
add("Instant Coffee (50 g)","ఇన్స్టెంట్ కాఫీ (50 గ్రా)",SB,"Nescafe","50 g",1,150,180,140,200,"☕",0,0)
add("Juice - Mango (1 L)","అవకాడో జ్యూస్ (1 లి)",SB,"Real","1 L",1,90,110,82,200,"🧃",0,0)
add("Juice - Mixed (1 L)","మిక్స్డ్ జ్యూస్ (1 లి)",SB,"Real","1 L",1,90,110,82,200,"🧃",0,0)
add("Cola (1.25 L)","కోలా (1.25 లి)",SB,"Coca Cola","1.25 L",1,60,70,55,300,"🥤",0,0)
add("Water - Bisleri (1 L)","బిస్లెరి వాటర్ (1 లి)",SB,"Bisleri","1 L",1,20,25,18,500,"💧",0,1)
add("Water - Bisleri (5 L)","బిస్లెరి వాటర్ (5 లి)",SB,"Bisleri","5 L",1,90,110,82,200,"💧",0,0)
add("Energy Drink (250 ml)","ఎనర్జీ డ్రింక్ (250 మిలీ)",SB,"Red Bull","250 ml",1,120,140,110,150,"⚡",0,0)
add("Chocolate - Dairy Milk (150 g)","డెయిరీ మిల్క్ (150 గ్రా)",SB,"Cadbury","150 g",1,180,210,165,200,"🍫",0,0)
add("Ice Cream - Vanila (500 ml)","వెనిల ఐస్‌క్రీమ్ (500 మిలీ)",SB,"Amul","500 ml",1,120,140,110,150,"🍦",0,0)
add("Ice Cream - Chocolate (500 ml)","చాక్లెట్ ఐస్‌క్రీమ్ (500 మిలీ)",SB,"Amul","500 ml",1,120,140,110,150,"🍦",0,0)
add("Namkeen - Mixture (1 kg)","నామకేన్ మిశ్రమం (1 కిలో)",SB,"Local","1 kg",1,160,190,140,150,"🥜",0,0)
add("Bread - White (400 g)","వైట్ బ్రెడ్ (400 గ్రా)",SB,"Local Bakery","400 g",1,35,40,32,200,"🍞",1,0)

# ---- Household & Care ----
HC = "household-care"
_CAT_ALIAS["HC"] = HC
add("Detergent Powder (1 kg)","డెటర్జెంట్ పౌడర్ (1 కిలో)",HC,"Surf","1 kg",1,130,150,120,300,"🧺",0,1)
add("Detergent Powder (2 kg)","డెటర్జెంట్ పౌడర్ (2 కిలో)",HC,"Surf","2 kg",1,240,280,220,200,"🧺",0,0)
add("Dishwash Bar (250 g)","డిష్‌వాష్ బార్ (250 గ్రా)",HC,"Vim","250 g",1,45,55,40,300,"🧽",0,0)
add("Dishwash Liquid (500 ml)","డిష్‌వాష్ లిక్విడ్ (500 మిలీ)",HC,"Vim","500 ml",1,90,110,82,250,"🧽",0,0)
add("Bath Soap (100 g)","బాత్ సోప్ (100 గ్రా)",HC,"Lifebuoy","100 g",1,35,40,32,400,"🧼",0,1)
add("Bath Soap (150 g)","బాత్ సోప్ (150 గ్రా)",HC,"Dettol","150 g",1,45,55,40,300,"🧼",0,0)
add("Shampoo (340 ml)","షాంపూ (340 మిలీ)",HC,"Himalaya","340 ml",1,180,220,165,200,"🧴",0,0)
add("Toothpaste (150 g)","టూత్‌పేస్ట్ (150 గ్రా)",HC,"Colgate","150 g",1,90,110,82,300,"🪥",0,0)
add("Toothbrush (1 pc)","టూత్‌బ్రష్ (1)","HC","Colgate","1 pc",1,30,40,26,400,"🪥",0,0)
add("Face Wash (150 ml)","ఫేస్ వాష్ (150 మిలీ)",HC,"Himalaya","150 ml",1,120,150,110,200,"🧴",0,0)
add("Handwash (200 ml)","హ్యాండ్ వాష్ (200 మిలీ)",HC,"Dettol","200 ml",1,90,110,82,250,"🧴",0,0)
add("Floor Cleaner (500 ml)","ఫ్లోర్ క్లీనర్ (500 మిలీ)",HC,"Lizol","500 ml",1,110,130,100,200,"🧹",0,0)
add("Phenyl (500 ml)","ఫినైల్ (500 మిలీ)",HC,"Dettol","500 ml",1,60,75,55,250,"🧴",0,0)
add("Garbage Bags (30 pcs)","గార్బేజ్ బ్యాగ్స్ (30)",HC,"Local","30 pc",1,50,60,45,300,"🗑️",0,0)
add("Tissues (24 rolls)","టిష్యూస్ (24 రోల్స్)",HC,"Local","24 pc",1,120,150,110,200,"🧻",0,0)
add("Bath Tissue (6 rolls)","బాత్ టిష్యూ (6 రోల్స్)",HC,"Local","6 pc",1,90,110,82,250,"🧻",0,0)

# ---- Baby & Health ----
BH = "baby-health"
_CAT_ALIAS["BH"] = BH
add("Baby Milk Powder (400 g)","బేబీ పాలిండ్ (400 గ్రా)",BH,"Nestle","400 g",1,520,600,490,100,"🍼",0,0)
add("Baby Diapers - M (30 pcs)","బేబీ డయాపర్స్ - M (30)",BH,"Pampers","30 pc",1,450,520,420,100,"🍼",0,0)
add("Baby Diapers - L (30 pcs)","బేబీ డయాపర్స్ - L (30)",BH,"Pampers","30 pc",1,480,550,450,100,"🍼",0,0)
add("Baby Lotion (200 ml)","బేబీ లోషన్ (200 మిలీ)",BH,"Johnson","200 ml",1,180,220,165,100,"🍼",0,0)
add("Baby Powder (200 g)","బేబీ పౌడర్ (200 గ్రా)",BH,"Johnson","200 g",1,120,150,110,100,"🍼",0,0)
add("Paracetamol (10 tabs)","పారసెటమోల్ (10 టాబ్స్)",BH,"Cipla","10 pc",1,30,40,26,200,"💊",0,0)
add("ORS (10 sachets)","ORS (10 సాచెట్స్)",BH,"Electral","10 pc",1,60,75,55,200,"💊",0,0)
add("Cough Syrup (100 ml)","కఫ్ సిరప్ (100 మిలీ)",BH,"Benadryl","100 ml",1,80,100,72,150,"💊",0,0)
add("Vitamin C (10 tabs)","విటమిన్ C (10 టాబ్స్)",BH,"HealthKart","10 pc",1,60,80,55,150,"💊",0,0)
add("Hand Sanitizer (200 ml)","హ్యాండ్ సెనిటైజర్ (200 మిలీ)",BH,"Dettol","200 ml",1,90,110,82,200,"🧴",0,0)

# ---- Fresh Bakery & Sweets ----
BS = "bakery-sweets"
_CAT_ALIAS["BS"] = BS
add("Fresh Bread (400 g)","ఫ్రెష్ బ్రెడ్ (400 గ్రా)",BS,"Local Bakery","400 g",1,35,40,32,200,"🍞",1,1)
add("Pav (8 pcs)","పావ్ (8)","BS","Local Bakery","8 pc",1,40,48,36,150,"🍞",1,0)
add("Rusk (200 g)","రస్క్ (200 గ్రా)",BS,"Local Bakery","200 g",1,40,48,36,150,"🍪",1,0)
add("Mysore Pak (250 g)","మైసూర్ పక్ (250 గ్రా)",BS,"Local Sweets","250 g",1,120,140,110,100,"🍬",1,0)
add("Laddu (500 g)","లడ్డు (500 గ్రా)",BS,"Local Sweets","500 g",1,150,180,135,100,"🍬",1,1)
add("Barfi (500 g)","బర్ఫి (500 గ్రా)",BS,"Local Sweets","500 g",1,160,190,145,100,"🍬",1,0)
add("Gulab Jamun (500 g)","గులాబ్ జామున్ (500 గ్రా)",BS,"Local Sweets","500 g",1,140,170,125,100,"🍬",1,0)
add("Peda (500 g)","పేడా (500 గ్రా)",BS,"Local Sweets","500 g",1,150,180,135,100,"🍬",1,0)
add("Halwa (500 g)","హల్వా (500 గ్రా)",BS,"Local Sweets","500 g",1,130,160,115,100,"🍬",1,0)
add("Fresh Idli (6 pcs)","ఫ్రెష్ ఇడ్లీ (6)","BS","Local Bakery","6 pc",1,40,50,35,150,"🥣",1,1)
add("Fresh Dosa (4 pcs)","ఫ్రెష్ దోస (4)","BS","Local Bakery","4 pc",1,50,60,45,150,"🥞",1,0)
add("Vada (6 pcs)","వడ (6)","BS","Local Bakery","6 pc",1,45,55,40,150,"🍩",1,0)

# ---- Bulk / B2B ----
BB = "bulk-b2b"
_CAT_ALIAS["BB"] = BB
add("Rice - Sona Masoori (25 kg)","సోనా మసూరి (25 కిలో)",BB,"Sri Laxmi","25 kg",1,2350,2550,2150,50,"📦",0,0)
add("Rice - Sona Masoori (50 kg)","సోనా మసూరి (50 కిలో)",BB,"Sri Laxmi","50 kg",1,4600,4950,4250,30,"📦",0,0)
add("Sunflower Oil (15 L)","సన్‌ఫ్లవర్ ఆయిల్ (15 లి)",BB,"Sri Kanaka","15 L",1,2100,2400,1980,30,"📦",0,0)
add("Toor Dal (5 kg)","తుర్రు పప్పు (5 కిలో)",BB,"Local Mandi","5 kg",1,720,820,660,40,"📦",0,0)
add("Wheat Flour (25 kg)","గోధుమ అటా (25 కిలో)",BB,"Aashirvaad","25 kg",1,1100,1250,1020,30,"📦",0,0)
add("Detergent (10 kg)","డెటర్జెంట్ (10 కిలో)",BB,"Surf","10 kg",1,1200,1400,1100,30,"📦",0,0)
add("Bath Soap (20 pcs)","బాత్ సోప్ (20)","BB","Lifebuoy","20 pc",1,600,700,550,50,"📦",0,0)
add("Water (24 x 1 L)","వాటర్ (24 x 1 లి)",BB,"Bisleri","24 pc",1,450,520,420,50,"📦",0,0)
add("Milk (20 x 1 L)","పాలు (20 x 1 లి)",BB,"Nandini","20 pc",1,1000,1100,940,30,"📦",0,0)
add("Eggs (30 x 30)","గుడ్లు (30 x 30)",BB,"Farm Fresh","900 pc",1,5400,6000,5000,20,"📦",1,0)# ===========================================================================
#  SUPPLIERS  (mandi + farms — the cost advantage)
# ===========================================================================
SUPPLIERS = [
    ("Tenali APMC Mandi",          "mandi",       "Chilakaluripet NH16",        "08641-220001"),
    ("Chilakaluripet Farmers Co-op","farm",       "Purushottapatnam",           "98480-11111"),
    ("Krishna Basin Veg Farm",     "farm",        "Pasumarru",                  "98480-22222"),
    ("Guntur Cotton & Rice Depot", "wholesaler",  "Guntur",                     "0863-2444444"),
    ("Sri Kanaka Oils",            "distributor", "Chilakaluripet",             "98480-33333"),
    ("Nandini Dairy Centre",       "distributor", "Chilakaluripet",             "08641-255555"),
    ("Sri Laxmi Rice Mills",       "wholesaler",  "Chirala",                    "98480-44444"),
    ("Amul Distributor - Guntur",  "distributor", "Guntur",                     "0863-2666666"),
    ("Local Sweets & Bakery",      "farm",        "NRT Center",                 "98480-55555"),
    ("Farm Fresh Eggs",            "farm",        "Manukondavaripalem",         "98480-66666"),
]

# ===========================================================================
#  DELIVERY ZONES  (38 wards + 15 villages)
# ===========================================================================
ZONES = [
    # (name, type, pincode, sla_minutes, delivery_fee)
    # Municipality wards (38)
    ("Ward 1 - NRT Center",        "ward",    "522616", 30, 0),
    ("Ward 2 - Bazaar Road",       "ward",    "522616", 30, 0),
    ("Ward 3 - Bus Stand",         "ward",    "522616", 30, 0),
    ("Ward 4 - Temple Street",     "ward",    "522616", 30, 0),
    ("Ward 5 - Chowdaraiah Colony","ward",    "522616", 35, 0),
    ("Ward 6 - Railway Line",      "ward",    "522616", 35, 0),
    ("Ward 7 - College Road",      "ward",    "522616", 30, 0),
    ("Ward 8 - Hospital Road",     "ward",    "522616", 30, 0),
    ("Ward 9 - NH16 East",         "ward",    "522616", 35, 0),
    ("Ward 10 - NH16 West",        "ward",    "522616", 35, 0),
    ("Ward 11 - Market Yard",      "ward",    "522616", 30, 0),
    ("Ward 12 - Function Hall",    "ward",    "522616", 35, 0),
    ("Ward 13 - Old Town",         "ward",    "522616", 35, 0),
    ("Ward 14 - New Colony",       "ward",    "522616", 35, 0),
    ("Ward 15 - Lake View",        "ward",    "522616", 40, 10),
    ("Ward 16 - Industrial Area",  "ward",    "522616", 40, 10),
    ("Ward 17 - East Gate",        "ward",    "522616", 35, 0),
    ("Ward 18 - West Gate",        "ward",    "522616", 35, 0),
    ("Ward 19 - South Gate",       "ward",    "522616", 40, 10),
    ("Ward 20 - North Gate",       "ward",    "522616", 40, 10),
    ("Ward 21 - River Bank",       "ward",    "522616", 40, 10),
    ("Ward 22 - Canal Road",       "ward",    "522616", 40, 10),
    ("Ward 23 - Bypass East",      "ward",    "522616", 45, 10),
    ("Ward 24 - Bypass West",      "ward",    "522616", 45, 10),
    ("Ward 25 - Ghat Road",        "ward",    "522616", 45, 10),
    ("Ward 26 - Bus Depot",        "ward",    "522616", 35, 0),
    ("Ward 27 - School Lane",      "ward",    "522616", 35, 0),
    ("Ward 28 - Park Colony",      "ward",    "522616", 40, 10),
    ("Ward 29 - Market Square",    "ward",    "522616", 30, 0),
    ("Ward 30 - Temple East",      "ward",    "522616", 35, 0),
    ("Ward 31 - Temple West",      "ward",    "522616", 35, 0),
    ("Ward 32 - Bazaar East",      "ward",    "522616", 30, 0),
    ("Ward 33 - Bazaar West",      "ward",    "522616", 30, 0),
    ("Ward 34 - New Town",         "ward",    "522616", 40, 10),
    ("Ward 35 - East Extension",   "ward",    "522616", 45, 10),
    ("Ward 36 - West Extension",   "ward",    "522616", 45, 10),
    ("Ward 37 - South Extension",  "ward",    "522616", 45, 10),
    ("Ward 38 - North Extension",  "ward",    "522616", 45, 10),
    # Mandal villages (15)
    ("Purushottapatnam",           "village", "522616", 90, 20),
    ("Manukondavaripalem",         "village", "522616", 90, 20),
    ("Pasumarru",                  "village", "522616", 90, 20),
    ("Ganapavaram",                "village", "522616", 120, 25),
    ("Boppudi",                    "village", "522616", 120, 25),
    ("Edavalli",                   "village", "522616", 120, 25),
    ("Rajapeta",                   "village", "522616", 150, 30),
    ("Kavuru",                     "village", "522616", 150, 30),
    ("Vemavaram",                  "village", "522616", 120, 25),
    ("Appapuram",                  "village", "522616", 150, 30),
    ("Chintalavalasa",             "village", "522616", 120, 25),
    ("Nellimarla",                 "village", "522616", 150, 30),
    ("Pothur",                     "village", "522616", 120, 25),
    ("Sompeta",                    "village", "522616", 150, 30),
    ("Kondapalli",                 "village", "522616", 120, 25),
]

# ===========================================================================
#  DELIVERY PERSONS
# ===========================================================================
DELIVERY_PERSONS = [
    ("Ravi Kumar",   "98480-10001", "bike",  1),
    ("Suresh Babu",  "98480-10002", "bike",  2),
    ("Mahesh",       "98480-10003", "bike",  3),
    ("Prakash",      "98480-10004", "bike",  4),
    ("Venkat",       "98480-10005", "bike",  5),
    ("Anil",         "98480-10006", "bike",  6),
    ("Rajesh",       "98480-10007", "bike",  7),
    ("Kiran",        "98480-10008", "bike",  8),
    ("Srinivas",     "98480-10009", "tempo", 39),
    ("Ramesh",       "98480-10010", "tempo", 40),
    ("Ganesh",       "98480-10011", "tempo", 41),
    ("Narayan",      "98480-10012", "tempo", 42),
]

# ===========================================================================
#  USERS  (name, phone, email, is_plus)
# ===========================================================================
USERS = [
    ("Ramesh Chandra",   "98480-20001", "ramesh@example.com",    1),
    ("Lakshmi Devi",     "98480-20002", "lakshmi@example.com",   0),
    ("Srinivas Rao",     "98480-20003", "srinivas@example.com",  1),
    ("Anitha Kumari",    "98480-20004", "anitha@example.com",    0),
    ("Venkatesh",        "98480-20005", "venkatesh@example.com", 0),
    ("Padma",            "98480-20006", "padma@example.com",     1),
    ("Karthik",          "98480-20007", "karthik@example.com",   0),
    ("Sowmya",           "98480-20008", "sowmya@example.com",    0),
    ("Naveen",           "98480-20009", "naveen@example.com",    1),
    ("Deepika",          "98480-20010", "deepika@example.com",   0),
    ("Arjun",            "98480-20011", "arjun@example.com",     0),
    ("Meena",            "98480-20012", "meena@example.com",     0),
    ("Rahul",            "98480-20013", "rahul@example.com",     1),
    ("Priya",            "98480-20014", "priya@example.com",     0),
    ("Arun",             "98480-20015", "arun@example.com",      0),
]

# ===========================================================================
#  ADDRESSES  (user_idx, label, line1, area, pincode, zone_id, is_default)
# ===========================================================================
ADDRESSES = [
    (0, "Home",    "12-3-45, NRT Center",       "Ward 1",      "522616", 1,  1),
    (0, "Work",    "Sri Kanaka Oils",           "Ward 11",     "522616", 11, 0),
    (1, "Home",    "8-2-12, Bazaar Road",       "Ward 2",      "522616", 2,  1),
    (2, "Home",    "45-1-7, College Road",      "Ward 7",      "522616", 7,  1),
    (3, "Home",    "23-5-9, Bus Stand",         "Ward 3",      "522616", 3,  1),
    (4, "Home",    "10-1-3, Temple Street",     "Ward 4",      "522616", 4,  1),
    (5, "Home",    "67-2-1, Hospital Road",     "Ward 8",      "522616", 8,  1),
    (6, "Home",    "Purushottapatnam Village",  "Purushottapatnam", "522616", 39, 1),
    (7, "Home",    "Manukondavaripalem",        "Manukondavaripalem", "522616", 40, 1),
    (8, "Home",    "Pasumarru Village",         "Pasumarru",   "522616", 41, 1),
    (9, "Home",    "34-7-2, NH16 East",         "Ward 9",      "522616", 9,  1),
    (10,"Home",    "Ganapavaram Village",       "Ganapavaram", "522616", 43, 1),
    (11,"Home",    "15-3-8, Market Yard",       "Ward 11",     "522616", 11, 1),
    (12,"Home",    "Boppudi Village",           "Boppudi",     "522616", 44, 1),
    (13,"Home",    "28-1-5, College Road",      "Ward 7",      "522616", 7,  1),
    (14,"Home",    "Edavalli Village",          "Edavalli",    "522616", 45, 1),
]

# ===========================================================================
#  PROMOTIONS
# ===========================================================================
PROMOTIONS = [
    ("WELCOME50",  "₹50 off on your first order above ₹299",      "flat",    50,  299, 50,  "2026-08-01", "2026-12-31", 1),
    ("FRESH20",    "20% off on Fruits & Vegetables (max ₹100)",   "percent", 20,  199, 100, "2026-08-01", "2026-12-31", 1),
    ("PLUSFREE",   "Free delivery for Infinity Plus members",     "flat",    25,  0,   25,  "2026-08-01", "2026-12-31", 1),
    ("BULK10",     "10% off on Bulk / B2B orders above ₹2000",    "percent", 10,  2000,200, "2026-08-01", "2026-12-31", 1),
    ("MONDAY15",   "Monday special: 15% off above ₹499",          "percent", 15,  499, 150, "2026-08-01", "2026-12-31", 1),
    ("FESTIVE25",  "Festive: ₹25 off above ₹199",                 "flat",    25,  199, 25,  "2026-10-01", "2026-11-30", 1),
]

# ===========================================================================
#  REVIEWS  (product_idx, user_idx, rating, comment)
# ===========================================================================
REVIEWS = [
    (0,  1,  5, "Very fresh tomatoes, better than the kirana store!"),
    (0,  4,  4, "Good quality, delivered on time."),
    (1,  2,  5, "Onions are fresh and cheap. Love the mandi price!"),
    (18, 3,  5, "Bananas are sweet and fresh. Best in town."),
    (31, 5,  5, "Sona Masoori rice is great quality, good price."),
    (31, 8,  4, "Good rice, delivered in 30 mins."),
    (46, 6,  5, "Toor dal is fresh, no stones. Very happy."),
    (56, 7,  5, "Nandini milk always fresh. Great service."),
    (66, 9,  5, "Filter coffee is authentic. Tastes like home!"),
    (75, 10, 4, "Surf powder works great, good price."),
    (92, 11, 5, "Fresh idli and dosa, tastes like a tiffin center!"),
    (93, 12, 5, "Mysore pak is delicious, best in Chilakaluripet."),
    (94, 13, 5, "Laddu is fresh and tasty. Will order again."),
    (105,14, 5, "Bulk rice order was perfect for my canteen."),
    (110, 0,  5, "Eggs are fresh, no broken ones. Great!"),
    (2,  1,  5, "Potatoes are clean and fresh."),
    (5,  2,  4, "Green chillies are spicy, just right."),
    (17, 3,  5, "Gongura is fresh, tastes like farm-grown!"),
    (24, 4,  5, "Apple is sweet and juicy."),
    (62, 5,  5, "Ghee is pure, no adulteration."),
]

# ===========================================================================
#  SAMPLE ORDERS  (user_idx, address_idx, status, payment_mode, promo,
#                   items=[(product_idx, qty), ...], placed_days_ago)
# ===========================================================================
ORDERS = [
    (0, 0, "delivered", "upi",     "WELCOME50", [(0,2),(1,2),(2,1),(56,2),(66,1)], 25),
    (1, 2, "delivered", "cod",     None,        [(31,1),(46,1),(56,1),(75,1)],      22),
    (2, 3, "delivered", "upi",     "FRESH20",   [(0,1),(1,1),(2,1),(18,1),(66,1)],  20),
    (3, 4, "delivered", "card",    None,        [(31,1),(46,2),(56,1),(66,1)],      18),
    (4, 5, "delivered", "upi",     "WELCOME50", [(0,2),(1,2),(2,2),(56,2)],         15),
    (5, 6, "delivered", "cod",     None,        [(31,2),(46,1),(56,2),(75,1)],      14),
    (6, 7, "delivered", "upi",     "FRESH20",   [(0,1),(1,1),(18,1),(66,1)],        12),
    (7, 8, "delivered", "cod",     None,        [(31,1),(46,1),(56,1),(66,1)],      10),
    (8, 9, "delivered", "upi",     "PLUSFREE",  [(0,2),(1,2),(2,1),(56,2),(66,1)],   8),
    (9, 10,"delivered", "card",    None,        [(31,1),(46,2),(56,1)],              7),
    (10,11,"delivered", "upi",     "WELCOME50", [(0,1),(1,1),(2,1),(18,1),(66,1)],   6),
    (11,12,"delivered", "cod",     None,        [(31,1),(46,1),(56,1),(75,1)],       5),
    (12,13,"delivered", "upi",     "FRESH20",   [(0,2),(1,2),(18,1),(66,1)],         4),
    (13,14,"delivered", "cod",     None,        [(31,2),(46,1),(56,2)],              3),
    (14,15,"delivered", "upi",     "WELCOME50", [(0,1),(1,1),(2,1),(56,1),(66,1)],   2),
    (0, 0, "out_for_delivery","upi",None,       [(0,1),(1,1),(2,1),(56,1)],          0),
    (1, 2, "packed",        "cod", None,       [(31,1),(46,1),(56,1)],               0),
    (2, 3, "confirmed",     "upi", "FRESH20",  [(0,2),(1,2),(18,1)],                 0),
    (3, 4, "placed",        "upi", None,       [(31,1),(46,1),(56,1),(66,1)],        0),
    (4, 5, "placed",        "cod", None,       [(0,1),(1,1),(2,1),(56,1)],           0),
]

# ===========================================================================
#  MAIN
# ===========================================================================
def main():
    c = conn()
    cur = c.cursor()

    # schema
    with open(os.path.join(HERE, "schema.sql"), encoding="utf-8") as f:
        cur.executescript(f.read())

    # categories
    for name, te, slug, icon, sort in CATEGORIES:
        cur.execute("INSERT INTO categories(name,name_te,slug,icon,sort_order) VALUES(?,?,?,?,?)",
                    (name, te, slug, icon, sort))
    cat_id = {slug: cur.execute("SELECT id FROM categories WHERE slug=?", (slug,)).fetchone()[0]
              for (_, _, slug, _, _) in CATEGORIES}

    # products
    # image = real photo (frontend/assets/products/<id>.jpg); the emoji in the
    # list is kept only as a UI fallback if a photo is missing.
    for n, (name, te, cat, brand, unit, qty, price, mrp, mandi, stock, img, fresh, best) in enumerate(P):
        cur.execute("""INSERT INTO products(sku,name,name_te,category_id,brand,unit,unit_qty,
                       price,mrp,mandi_price,stock,image,is_fresh,is_best_seller)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    ("SKU-%04d" % (n+1), name, te, cat_id[cat], brand, unit, qty,
                     price, mrp, mandi, stock, "/assets/products/%d.jpg" % (n+1), fresh, best))
        # (is_active defaults to 1)
    prod_id = [r[0] for r in cur.execute("SELECT id FROM products ORDER BY id")]

    # suppliers
    for name, typ, loc, phone in SUPPLIERS:
        cur.execute("INSERT INTO suppliers(name,type,location,phone) VALUES(?,?,?,?)",
                    (name, typ, loc, phone))

    # mandi prices — 7 days of APMC history for key commodities
    MANDI_BASE = [
        ("Tomato",      28, "kg"), ("Onion",      34, "kg"), ("Potato",     24, "kg"),
        ("Ginger",      20, "200 g"), ("Garlic",   18, "100 g"), ("Green Chilli", 10, "100 g"),
        ("Banana",      40, "dozen"), ("Carrot",   24, "kg"), ("Cabbage",   18, "kg"),
        ("Brinjal",     26, "kg"), ("Okra",       20, "500 g"), ("Gongura",  14, "200 g"),
        ("Sona Masoori Rice", 88, "kg"), ("Toor Dal", 135, "kg"), ("Urad Dal", 148, "kg"),
        ("Sunflower Oil", 140, "L"), ("Groundnut Oil", 175, "L"), ("Eggs",  80, "dozen"),
    ]
    for day in range(6, -1, -1):
        d = (datetime.date.today() - datetime.timedelta(days=day)).isoformat()
        for commodity, base, unit in MANDI_BASE:
            drift = 1 + random.uniform(-0.06, 0.06)
            price = round(base * drift, 0)
            cur.execute("""INSERT INTO mandi_prices(commodity,price,unit,min_price,max_price,price_date)
                           VALUES(?,?,?,?,?,?)""",
                        (commodity, price, unit, round(price*0.95,0), round(price*1.08,0), d))

    # delivery zones
    for name, typ, pin, sla, fee in ZONES:
        cur.execute("INSERT INTO delivery_zones(name,type,pincode,sla_minutes,delivery_fee) VALUES(?,?,?,?,?)",
                    (name, typ, pin, sla, fee))

    # delivery persons
    for name, phone, vehicle, zone in DELIVERY_PERSONS:
        cur.execute("INSERT INTO delivery_persons(name,phone,vehicle,zone_id) VALUES(?,?,?,?)",
                    (name, phone, vehicle, zone))

    # users
    for name, phone, email, plus in USERS:
        cur.execute("INSERT INTO users(full_name,phone,email,is_plus) VALUES(?,?,?,?)",
                    (name, phone, email, plus))
    user_id = [r[0] for r in cur.execute("SELECT id FROM users ORDER BY id")]

    # addresses
    for ui, label, line1, area, pin, zone, default in ADDRESSES:
        cur.execute("""INSERT INTO addresses(user_id,label,line1,area,pincode,zone_id,is_default)
                       VALUES(?,?,?,?,?,?,?)""",
                    (user_id[ui], label, line1, area, pin, zone, default))
    addr_id = [r[0] for r in cur.execute("SELECT id FROM addresses ORDER BY id")]

    # promotions
    for code, desc, dtype, dval, mino, maxd, vf, vt, active in PROMOTIONS:
        cur.execute("""INSERT INTO promotions(code,description,discount_type,discount_value,
                       min_order,max_discount,valid_from,valid_to,is_active)
                       VALUES(?,?,?,?,?,?,?,?,?)""",
                    (code, desc, dtype, dval, mino, maxd, vf, vt, active))

    # reviews
    for pi, ui, rating, comment in REVIEWS:
        cur.execute("INSERT INTO reviews(product_id,user_id,rating,comment) VALUES(?,?,?,?)",
                    (prod_id[pi], user_id[ui], rating, comment))

    # orders + items + payments
    for oi, ai, status, pmode, promo, items, days_ago in ORDERS:
        placed = (datetime.date.today() - datetime.timedelta(days=days_ago)).isoformat()
        # compute totals
        subtotal = 0.0
        for pi, qty in items:
            p = cur.execute("SELECT price FROM products WHERE id=?", (prod_id[pi],)).fetchone()[0]
            subtotal += p * qty
        # apply promo
        discount = 0.0
        if promo:
            row = cur.execute("SELECT discount_type,discount_value,max_discount FROM promotions WHERE code=?",
                              (promo,)).fetchone()
            if row:
                dtype, dval, maxd = row
                if dtype == "flat":
                    discount = min(dval, subtotal)
                else:
                    discount = min((dval/100.0)*subtotal, maxd or 1e9)
        # delivery fee from address zone
        zone_fee = cur.execute("SELECT delivery_fee FROM addresses a JOIN delivery_zones z ON a.zone_id=z.id WHERE a.id=?",
                               (addr_id[ai],)).fetchone()[0]
        # plus members get free delivery
        if cur.execute("SELECT is_plus FROM users WHERE id=?", (user_id[oi],)).fetchone()[0]:
            zone_fee = 0.0
        gst = round((subtotal - discount) * 0.05, 2)
        total = round(subtotal - discount + zone_fee + gst, 2)
        order_no = "INF-%s-%05d" % (placed[:4], cur.execute("SELECT COUNT(*) FROM orders").fetchone()[0]+1)
        cur.execute("""INSERT INTO orders(order_no,user_id,address_id,zone_id,status,subtotal,discount,
                       delivery_fee,gst,total,payment_mode,payment_status,promo_code,placed_at,delivered_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (order_no, user_id[oi], addr_id[ai],
                     cur.execute("SELECT zone_id FROM addresses WHERE id=?", (addr_id[ai],)).fetchone()[0],
                     status, round(subtotal,2), round(discount,2), zone_fee, gst, total,
                     pmode, "paid" if status=="delivered" else "pending", promo, placed,
                     placed if status=="delivered" else None))
        order_id = cur.execute("SELECT last_insert_rowid()").fetchone()[0]
        for pi, qty in items:
            p = cur.execute("SELECT price FROM products WHERE id=?", (prod_id[pi],)).fetchone()[0]
            cur.execute("INSERT INTO order_items(order_id,product_id,qty,unit_price,line_total) VALUES(?,?,?,?,?)",
                        (order_id, prod_id[pi], qty, p, round(p*qty,2)))
        cur.execute("INSERT INTO payments(order_id,amount,mode,status,txn_ref) VALUES(?,?,?,?,?)",
                    (order_id, total, pmode, "success" if status=="delivered" else "pending",
                     "TXN-%s" % order_no[-6:]))

    c.commit()

    # summary
    print("=== Infinity Delivery DB built ===")
    for t in ["categories","products","suppliers","mandi_prices","delivery_zones","delivery_persons",
              "users","addresses","promotions","reviews","orders","order_items","payments"]:
        n = cur.execute("SELECT COUNT(*) FROM %s" % t).fetchone()[0]
        print("  %-18s %5d" % (t, n))
    print("DB path:", DB)
    c.close()

if __name__ == "__main__":
    main()