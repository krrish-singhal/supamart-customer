import { optimizeCloudinaryUrl } from './cloudinaryImage';

// Static require() map for locally-bundled product images, keyed by the exact
// product `name` string in the Firestore `products` collection. 114 entries are the
// original catalog's photos (customer/assets/Cleaned_Products, background-removed and
// styled via the project's established pipeline). 166 more were added from manually
// sourced photos (customer/assets/New_Products) for the newer 196-item catalog, matched
// by hand against actual packaging (filenames in that source folder carry no product
// info), then run through the same pipeline: AI background removal (skipped for any
// source photo that already had real transparency -- re-running it risks eating into the
// product itself), crop to content, padded, upscaled to 1080px, sharpened. 17 products in
// the newer catalog have no photo here -- no usable source photo existed for them (some
// candidates were watermarked recipe photos of a cooked dish, a different product
// category entirely, or simply weren't provided) -- and 2 more (White Kadala / Black
// Benny, Bourbon Neapolitan Cream) were explicitly held back. All of these fall through
// to the placeholder icon below rather than showing an incorrect image.
//
// Metro requires require() paths to be static, and the target file must exist at bundle
// time -- so this map can only reference files that are actually present in
// assets/Cleaned_Products/. Not every product has a local photo; callers must fall back
// to the product's remote `images` URL (or a placeholder icon) when a name isn't present
// here. See getProductImageSource() below.

const productImages = {
  "Toor Dal (Unpolished)": require("../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp"),
  "Toor Dal": require("../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp"),
  "Full Cream Milk": require("../../assets/Brand_Logos/Milma.webp"),
  "Milk": require("../../assets/Brand_Logos/Milma.webp"),
  "Tomato (Local)": require("../../assets/Fresh Vegetables/tomato-local__prod-tomato-local.webp"),
  "Tomato": require("../../assets/Fresh Vegetables/tomato-local__prod-tomato-local.webp"),
  "Sweet Corn": require("../../assets/Fresh Vegetables/sweet-corn__prod-sweet-corn.webp"),
  "Green Chilli": require("../../assets/Fresh Vegetables/green-chilli__prod-green-chilli.webp"),
  "Bottle Gourd": require("../../assets/Cleaned_Products/Bottle Gourd.webp"),
  "Onion": require("../../assets/Fresh Vegetables/onion__prod-onion.webp"),
  "Potato": require("../../assets/Fresh Vegetables/potato__ywIos8c1XC5PEAUUZ8f0.webp"),
  "Local Greens (Bal Chambu)": require("../../assets/Cleaned_Products/Local Greens Bal Chambu.webp"),
  "Vada Paruppu (Urad Dal)": require("../../assets/Cleaned_Products/Vada Paruppu Urad Dal.webp"),
  "Dream Cream Orange / Cashewnut": require("../../assets/Cleaned_Products/Dream Cream Orange Cashewnut.webp"),
  "Ginger": require("../../assets/Fresh Vegetables/ginger__embA4YBbzdWPk6HiKodE.webp"),
  "Dates Syrup": require("../../assets/Dry Fruits & Nuts/dates-syrup__Ym4Ei0GmBtFhGsSSwYFs.webp"),
  "TT Asafoetida Cake": require("../../assets/Cleaned_Products/TT Asafoetida Cake.webp"),
  "Power Soap": require("../../assets/Cleaned_Products/Power Soap.webp"),
  "Milma Ghee": require("../../assets/Cleaned_Products/Milma Ghee.webp"),
  "Sunfeast Golden Bakery": require("../../assets/Cleaned_Products/Sunfeast Golden Bakery.webp"),
  "Lia Agarbathy (Apple/Rose/Lavender/Jasmine)": require("../../assets/Cleaned_Products/Lia Agarbathy Apple Rose Lavender Jasmine.webp"),
  "Tiger KR Coconut": require("../../assets/Cleaned_Products/Tiger KR Coconut.webp"),
  "Mango": require("../../assets/Cleaned_Products/Mango.webp"),
  "50-50 Biscuits": require("../../assets/Cleaned_Products/50-50 Biscuits.webp"),
  "786 Surekha Rice": require("../../assets/Cleaned_Products/786 Surekha Rice.webp"),
  "Anus Chilly Sauce": require("../../assets/Cleaned_Products/Anus Chilly Sauce.webp"),
  "Anus Chukku Kappi (Ginger Coffee Mix)": require("../../assets/Cleaned_Products/Anus Chukku Kappi Ginger Coffee Mix.webp"),
  "Anus Dates Pickle": require("../../assets/Cleaned_Products/Anus Dates Pickle.webp"),
  "Anus Lemon Pickle": require("../../assets/Cleaned_Products/Anus Lemon Pickle.webp"),
  "Anus Mango Pickle": require("../../assets/Cleaned_Products/Anus Mango Pickle.webp"),
  "Anus Soya Sauce": require("../../assets/Cleaned_Products/Anus Soya Sauce.webp"),
  "Anus Tender Mango Pickle": require("../../assets/Cleaned_Products/Anus Tender Mango Pickle.webp"),
  "Anus Tomatto Sauce": require("../../assets/Cleaned_Products/Anus Tomatto Sauce.webp"),
  "AVT Premium Tea": require("../../assets/Cleaned_Products/AVT Premium Tea.webp"),
  "Bakers Kasuri Methi": require("../../assets/Cleaned_Products/Bakers Kasuri Methi.webp"),
  "Banana Flower (Ullie Poo)": require("../../assets/Cleaned_Products/Banana Flower Ullie Poo.webp"),
  "Beans": require("../../assets/Fresh Vegetables/beans__uqYEvkNgva7SIgQ5orFn.webp"),
  "Beet Root": require("../../assets/Fresh Vegetables/beet-root__cPPZggLI450T7cE3Diia.webp"),
  "Bharath Doppi Rice": require("../../assets/Cleaned_Products/Bharath Doppi Rice.webp"),
  "Black Pepper Powder": require("../../assets/Spices & Masala/black-pepper-powder__vz0IU7RfU2jzaP3Y2WOm.webp"),
  "Boost 200 gm Pouch": require("../../assets/Cleaned_Products/Boost 200 gm Pouch.webp"),
  "Boost 500 gm Jar": require("../../assets/Cleaned_Products/Boost 500 gm Jar.webp"),
  "Bounty (S.Bounty)": require("../../assets/Cleaned_Products/Bounty S.Bounty.webp"),
  "Brinjal": require("../../assets/Fresh Vegetables/brinjal__Cjp3EMDiYrwMlhV1o640.webp"),
  "Bru Coffee Instant": require("../../assets/Cleaned_Products/Bru Coffee Instant.webp"),
  "Bru Coffee Pure": require("../../assets/Cleaned_Products/Bru Coffee Pure.webp"),
  "Capsicum (Green)": require("../../assets/Cleaned_Products/Capsicum Green.webp"),
  "Carrot": require("../../assets/Cleaned_Products/Carrot.webp"),
  "Cashew Split": require("../../assets/Dry Fruits & Nuts/cashew-split__DOCUVuLTTkIO0DCgtTH9.webp"),
  "Cheru Paruppu (Moong Dal)": require("../../assets/Rice Atta & Grains/cheru-paruppu-moong-dal__XOFSm9gAddt4WEyLcv1N.webp"),
  "Chicken Masala Powder": require("../../assets/Spices & Masala/chicken-masala-powder__TCQzph6z2cm8ypODaKU1.webp"),
  "Chilli Powder": require("../../assets/Spices & Masala/chilli-powder__ZH7rtHh55An2JyyQ98qE.webp"),
  "Chocolate Horlicks Refill 1Kg": require("../../assets/Cleaned_Products/Chocolate Horlicks Refill 1Kg.webp"),
  "Chocolate Horlicks Sachet 75g": require("../../assets/Cleaned_Products/Chocolate Horlicks Sachet 75g.webp"),
  "Clear Hair Oil 75ml": require("../../assets/Cleaned_Products/Clear Hair Oil 75ml.webp"),
  "Clinic Plus Hair Shampoo": require("../../assets/Cleaned_Products/Clinic Plus Hair Shampoo.webp"),
  "Clinic Plus Hair Shampoo Straight & Shine 175ml": require("../../assets/Cleaned_Products/Clinic Plus Hair Shampoo Straight and Shine 175ml.webp"),
  "Clinic Plus Hair Shampoo Strong & Extra Thick 175ml": require("../../assets/Cleaned_Products/Clinic Plus Hair Shampoo Strong and Extra Thick 175ml.webp"),
  "Clinic Plus Hair Shampoo Strong & Shine 6ml": require("../../assets/Cleaned_Products/Clinic Plus Hair Shampoo Strong and Shine 6ml.webp"),
  "Clinic Plus Hair Shampoo Strong Scalp": require("../../assets/Cleaned_Products/Clinic Plus Hair Shampoo Strong Scalp.webp"),
  "Clinic Plus Strong And Smooth 6ml": require("../../assets/Cleaned_Products/Clinic Plus Strong And Smooth 6ml.webp"),
  "Close Up Toothpaste Deep Action Red Hot Gel 26g": require("../../assets/Cleaned_Products/Close Up Toothpaste Deep Action Red Hot Gel 26g.webp"),
  "Close Up Toothpaste Ever Fresh Red Hot Gel 40g": require("../../assets/Cleaned_Products/Close Up Toothpaste Ever Fresh Red Hot Gel 40g.webp"),
  "Comfort Fabric Conditioner Blue 220ml": require("../../assets/Cleaned_Products/Comfort Fabric Conditioner Blue 220ml.webp"),
  "Comfort Fabric Conditioner Pink 220ml": require("../../assets/Cleaned_Products/Comfort Fabric Conditioner Pink 220ml.webp"),
  "Coriander Leaves (Malli)": require("../../assets/Fresh Vegetables/coriander-leaves-malli__aAB6ouRQd8ijH7kzPkoF.webp"),
  "Coriander Powder": require("../../assets/Spices & Masala/coriander-powder__2foB8BGN2Uyb9tlm7Euf.webp"),
  "Cucumber": require("../../assets/Fresh Vegetables/cucumber__vk2AoARLUO7mwJ5DRLys.webp"),
  "Cumin (Jeera) Powder": require("../../assets/Cleaned_Products/Cumin Jeera Powder.webp"),
  "Curry Leaves (K. Leaves)": require("../../assets/Fresh Vegetables/curry-leaves-k-leaves__mp7RsN7Fr9ixuDjwTDp7.webp"),
  "Cycle 3-in-1 Agarbathi": require("../../assets/Cleaned_Products/Cycle 3-in-1 Agarbathi.webp"),
  "Dabur Almond Hair Oil": require("../../assets/Cleaned_Products/Dabur Almond Hair Oil.webp"),
  "Dabur Amla Hair Oil": require("../../assets/Cleaned_Products/Dabur Amla Hair Oil.webp"),
  "Dabur Glucose": require("../../assets/Cleaned_Products/Dabur Glucose.webp"),
  "Dabur Red Toothpaste": require("../../assets/Cleaned_Products/Dabur Red Toothpaste.webp"),
  "Dabur Vatika Hair Oil": require("../../assets/Cleaned_Products/Dabur Vatika Hair Oil.webp"),
  "Dark Fantasy Bourbon": require("../../assets/Cleaned_Products/Dark Fantasy Bourbon.webp"),
  "Dark Fantasy Vanilla": require("../../assets/Cleaned_Products/Dark Fantasy Vanilla.webp"),
  "Devon Chilly Powder": require("../../assets/Cleaned_Products/Devon Chilly Powder.webp"),
  "Devon Coriander Powder": require("../../assets/Cleaned_Products/Devon Coriander Powder.webp"),
  "Devon Corn Starch (household/cooking use)": require("../../assets/Cleaned_Products/Devon Corn Starch household cooking use.webp"),
  "DH Corn Flour": require("../../assets/Cleaned_Products/DH Corn Flour.webp"),
  "DH Easy Idiyappam": require("../../assets/Cleaned_Products/DH Easy Idiyappam.webp"),
  "DH Idiyappam / Appam Podi": require("../../assets/Cleaned_Products/DH Idiyappam Appam Podi.webp"),
  "DH Macroni": require("../../assets/Cleaned_Products/DH Macroni.webp"),
  "DH Palada Payasam Mix": require("../../assets/Cleaned_Products/DH Palada Payasam Mix.webp"),
  "DH Roast Ragi Powder": require("../../assets/Cleaned_Products/DH Roast Ragi Powder.webp"),
  "DH Turmeric Powder": require("../../assets/Cleaned_Products/DH Turmeric Powder.webp"),
  "DH Vermicelli Mix": require("../../assets/Cleaned_Products/DH Vermicelli Mix.webp"),
  "DH White Puttu Podi": require("../../assets/Cleaned_Products/DH White Puttu Podi.webp"),
  "Dolphin IR8 Pachari Rice": require("../../assets/Cleaned_Products/Dolphin IR8 Pachari Rice.webp"),
  "Dove Bathing Soap Cream Beauty 50g": require("../../assets/Cleaned_Products/Dove Bathing Soap Cream Beauty 50g.webp"),
  "Dove Daily Shine Shampoo & Conditioner Twin Sachet": require("../../assets/Cleaned_Products/Dove Daily Shine Shampoo and Conditioner Twin Sachet.webp"),
  "Dove Glycolic Hydration Mid Shampoo 180ml": require("../../assets/Cleaned_Products/Dove Glycolic Hydration Mid Shampoo 180ml.webp"),
  "Dove Hair Conditioner Daily Shine": require("../../assets/Cleaned_Products/Dove Hair Conditioner Daily Shine.webp"),
  "Dove Hair Conditioner Dryness Care 80ml": require("../../assets/Cleaned_Products/Dove Hair Conditioner Dryness Care 80ml.webp"),
  "Dove Hair Conditioner Hair Fall Rescue": require("../../assets/Cleaned_Products/Dove Hair Conditioner Hair Fall Rescue.webp"),
  "Dove Hair Conditioner Intense Damage Therapy": require("../../assets/Cleaned_Products/Dove Hair Conditioner Intense Damage Therapy.webp"),
  "Dove Hair Shampoo & Conditioner Hair Fall Therapy": require("../../assets/Cleaned_Products/Dove Hair Shampoo and Conditioner Hair Fall Therapy.webp"),
  "Dove Hair Shampoo & Conditioner Intense Repair": require("../../assets/Cleaned_Products/Dove Hair Shampoo and Conditioner Intense Repair.webp"),
  "Dove Hair Shampoo Anti Dandruff Therapy": require("../../assets/Cleaned_Products/Dove Hair Shampoo Anti Dandruff Therapy.webp"),
  "Dove Hair Shampoo Clean & Fresh 6ml": require("../../assets/Cleaned_Products/Dove Hair Shampoo Clean and Fresh 6ml.webp"),
  "Dove Hair Shampoo Daily Shine": require("../../assets/Cleaned_Products/Dove Hair Shampoo Daily Shine.webp"),
  "Dove Hair Shampoo Dandruff Care 80ml": require("../../assets/Cleaned_Products/Dove Hair Shampoo Dandruff Care 80ml.webp"),
  "Dove Hair Shampoo Dryness Care 80ml": require("../../assets/Cleaned_Products/Dove Hair Shampoo Dryness Care 80ml.webp"),
  "Dove Hair Shampoo Hair Fall Rescue 80ml": require("../../assets/Cleaned_Products/Dove Hair Shampoo Hair Fall Rescue 80ml.webp"),
  "Dove Hair Shampoo Hair Fall Therapy": require("../../assets/Cleaned_Products/Dove Hair Shampoo Hair Fall Therapy.webp"),
  "Dove Hair Shampoo Healthy Ritual For Growing Hair": require("../../assets/Cleaned_Products/Dove Hair Shampoo Healthy Ritual For Growing Hair.webp"),
  "Dove Hair Shampoo Intense Repair": require("../../assets/Cleaned_Products/Dove Hair Shampoo Intense Repair.webp"),
  "Dove Men+ Care Ad 2In1 Shampoo+Conditioner": require("../../assets/Cleaned_Products/Dove Men Plus Care Ad 2In1 Shampoo Plus Conditioner.webp"),
  "Dove Pink Serum Beauty Bar": require("../../assets/Cleaned_Products/Dove Pink Serum Beauty Bar.webp"),
  "Drumstick (Salladu)": require("../../assets/Cleaned_Products/Drumstick Salladu.webp"),
  "E-fee Washing Liquid": require("../../assets/Cleaned_Products/E-fee Washing Liquid.webp"),
  "Egg Masala Powder": require("../../assets/Spices & Masala/egg-masala-powder__LJDZij61suRxIHo3r1MN.webp"),
  "Elite Atta": require("../../assets/Cleaned_Products/Elite Atta.webp"),
  "Elite Maida": require("../../assets/Cleaned_Products/Elite Maida.webp"),
  "Elite Rava": require("../../assets/Cleaned_Products/Elite Rava.webp"),
  "Elite Rice Puttu Podi": require("../../assets/Cleaned_Products/Elite Rice Puttu Podi.webp"),
  "Exo Dishwash Bar": require("../../assets/Cleaned_Products/Exo Dishwash Bar.webp"),
  "Flowers (assorted, for pooja)": require("../../assets/Cleaned_Products/Flowers assorted, for pooja.webp"),
  "Garam Masala Powder": require("../../assets/Cleaned_Products/Garam Masala Powder.webp"),
  "Ginger Garlic Paste": require("../../assets/Cleaned_Products/Ginger Garlic Paste.webp"),
  "Ginger Pickle": require("../../assets/Cleaned_Products/Ginger Pickle.webp"),
  "Glow & Lovely Facewash Fairness 50g": require("../../assets/Cleaned_Products/Glow and Lovely Facewash Fairness 50g.webp"),
  "Gold Walnut": require("../../assets/Cleaned_Products/Gold Walnut.webp"),
  "Good Day Butter": require("../../assets/Cleaned_Products/Good Day Butter.webp"),
  "Good Day Cashew": require("../../assets/Cleaned_Products/Good Day Cashew.webp"),
  "Good Day Chocochip": require("../../assets/Cleaned_Products/Good Day Chocochip.webp"),
  "Good Day Pista Badam": require("../../assets/Cleaned_Products/Good Day Pista Badam.webp"),
  "Gooseberry (Nelli Kai)": require("../../assets/Fresh Vegetables/gooseberry-nelli-kai__86HqFg4mAEPpPERJZrYb.webp"),
  "Green Chilly": require("../../assets/Fresh Vegetables/green-chilly__e2BR5zJ1G2TFJ8uovSJI.webp"),
  "Green Peas 1st": require("../../assets/Cleaned_Products/Green Peas 1st.webp"),
  "Hamam Soap": require("../../assets/Cleaned_Products/Hamam Soap.webp"),
  "Hellmann's Mayo Smoky Tandoori 85g": require("../../assets/Cleaned_Products/Hellmann's Mayo Smoky Tandoori 85g.webp"),
  "Hellmann's Sauce Mayonnaise Doy Pack 85g": require("../../assets/Cleaned_Products/Hellmann's Sauce Mayonnaise Doy Pack 85g.webp"),
  "Horlicks Plain Biscuits 45g": require("../../assets/Cleaned_Products/Horlicks Plain Biscuits 45g.webp"),
  "Horlicks Ready-to-Drink 125ml Chocolate": require("../../assets/Cleaned_Products/Horlicks Ready-to-Drink 125ml Chocolate.webp"),
  "Idiyappam Podi (steamed)": require("../../assets/Cleaned_Products/Idiyappam Podi steamed.webp"),
  "Indulekha Hair Shampoo Bringha Hair Fall Cleanser": require("../../assets/Cleaned_Products/Indulekha Hair Shampoo Bringha Hair Fall Cleanser.webp"),
  "Kadala Mavu (Chickpea Flour)": require("../../assets/Cleaned_Products/Kadala Mavu Chickpea Flour.webp"),
  "Kadala Paruppu (Chana Dal)": require("../../assets/Rice Atta & Grains/kadala-paruppu-chana-dal__bsJzTmYafFijM3dEAGpP.webp"),
  "Kashmiri Chilli Powder": require("../../assets/Cleaned_Products/Kashmiri Chilli Powder.webp"),
  "Kellogg's Chocos": require("../../assets/Cleaned_Products/Kellogg's Chocos.webp"),
  "Kellogg's Corn Flakes": require("../../assets/Cleaned_Products/Kellogg's Corn Flakes.webp"),
  "Kismiss Medium (Raisins Seedless)": require("../../assets/Cleaned_Products/Kismiss Medium Raisins Seedless.webp"),
  "Kissan Hari Chutney 100g Doy": require("../../assets/Cleaned_Products/Kissan Hari Chutney 100g Doy.webp"),
  "Kissan Imli Khajoor Chutney 100g Doy": require("../../assets/Cleaned_Products/Kissan Imli Khajoor Chutney 100g Doy.webp"),
  "Kissan Jam Mixed Fruit 100g": require("../../assets/Cleaned_Products/Kissan Jam Mixed Fruit 100g.webp"),
  "Kissan Jam Orange Marmalade 500g": require("../../assets/Cleaned_Products/Kissan Jam Orange Marmalade 500g.webp"),
  "Kissan Ketchup Fresh Tomato Chotu 90g": require("../../assets/Cleaned_Products/Kissan Ketchup Fresh Tomato Chotu 90g.webp"),
  "Kissan Lehsun Mirch Chutney 100g Doy": require("../../assets/Cleaned_Products/Kissan Lehsun Mirch Chutney 100g Doy.webp"),
  "Kit Kat Miniatures": require("../../assets/Cleaned_Products/Kit Kat Miniatures.webp"),
  "Kitchen King BT Rice": require("../../assets/Cleaned_Products/Kitchen King BT Rice.webp"),
  "Knorr Cream of Broccoli Cup-A-Soup 12.5g": require("../../assets/Cleaned_Products/Knorr Cream of Broccoli Cup-A-Soup 12.5g.webp"),
  "Knorr Cup A Soup Instant Hot & Sour 11g": require("../../assets/Cleaned_Products/Knorr Cup A Soup Instant Hot and Sour 11g.webp"),
  "Knorr Cup A Soup Instant Manchow 12g": require("../../assets/Cleaned_Products/Knorr Cup A Soup Instant Manchow 12g.webp"),
  "Knorr Cup A Soup Instant Mix Vegetable 18g": require("../../assets/Cleaned_Products/Knorr Cup A Soup Instant Mix Vegetable 18g.webp"),
  "Knorr Cup A Soup Instant Sweet Corn 10g": require("../../assets/Cleaned_Products/Knorr Cup A Soup Instant Sweet Corn 10g.webp"),
  "Knorr Cup A Soup Instant Tomato Chatpata 16g": require("../../assets/Cleaned_Products/Knorr Cup A Soup Instant Tomato Chatpata 16g.webp"),
  "KP Herbal Paste": require("../../assets/Cleaned_Products/KP Herbal Paste.webp"),
  "KPR Jaya Rice": require("../../assets/Cleaned_Products/KPR Jaya Rice.webp"),
  "Ladies Finger": require("../../assets/Fresh Vegetables/ladies-finger__Xs96pFXTQuEtroJX1bTO.webp"),
  "Lemon": require("../../assets/Fresh Vegetables/lemon__Ylce3S5MpG2p29IT3Rfr.webp"),
  "Lifebuoy Bathing Soap Care 100% Stronger Germ Protection": require("../../assets/Cleaned_Products/Lifebuoy Bathing Soap Care 100% Stronger Germ Protection.webp"),
  "Lifebuoy Bathing Soap Lemon Fresh": require("../../assets/Cleaned_Products/Lifebuoy Bathing Soap Lemon Fresh.webp"),
  "Lifebuoy Bathing Soap Total 10 4x65g": require("../../assets/Cleaned_Products/Lifebuoy Bathing Soap Total 10 4x65g.webp"),
  "Lifebuoy Bathing Soap Turmeric And Honey": require("../../assets/Cleaned_Products/Lifebuoy Bathing Soap Turmeric And Honey.webp"),
  "Lifebuoy Hand Wash Powder to Liquid 10g": require("../../assets/Cleaned_Products/Lifebuoy Hand Wash Powder to Liquid 10g.webp"),
  "Lifebuoy Ice Bath 65g x 4": require("../../assets/Cleaned_Products/Lifebuoy Ice Bath 65g x 4.webp"),
  "Lifebuoy Neem & Aloe Soap": require("../../assets/Cleaned_Products/Lifebuoy Neem and Aloe Soap.webp"),
  "Lifebuoy Total Protect": require("../../assets/Cleaned_Products/Lifebuoy Total Protect.webp"),
  "Lipton Clear And Light J&A 100g": require("../../assets/Cleaned_Products/Lipton Clear And Light J and A 100g.webp"),
  "Lipton Green Tea Bags Honey Lemon 10 Pcs": require("../../assets/Cleaned_Products/Lipton Green Tea Bags Honey Lemon 10 Pcs.webp"),
  "Lipton Green Tea Clear & Light 10s TB": require("../../assets/Cleaned_Products/Lipton Green Tea Clear and Light 10s TB.webp"),
  "Lipton Green Tea Honey Lemon 100g": require("../../assets/Cleaned_Products/Lipton Green Tea Honey Lemon 100g.webp"),
  "Liril Bathing Soap Lime 75g": require("../../assets/Cleaned_Products/Liril Bathing Soap Lime 75g.webp"),
  "Long Beans (Payeru)": require("../../assets/Fresh Vegetables/long-beans-payeru__xIJlLuBAMpcDOhpDnSHh.webp"),
  "Lux Advanced Bright Glow": require("../../assets/Cleaned_Products/Lux Advanced Bright Glow.webp"),
  "Lux Bathing Soap Fresh Flash Water Lily & Cooling": require("../../assets/Cleaned_Products/Lux Bathing Soap Fresh Flash Water Lily and Cooling.webp"),
  "Lux Bathing Soap International Creamy Perfume": require("../../assets/Cleaned_Products/Lux Bathing Soap International Creamy Perfume.webp"),
  "Lux Bathing Soap Soft Touch 4 x 60g": require("../../assets/Cleaned_Products/Lux Bathing Soap Soft Touch 4 x 60g.webp"),
  "Lux Bathing Soap Velvet Touch Jasmine And Almond": require("../../assets/Cleaned_Products/Lux Bathing Soap Velvet Touch Jasmine And Almond.webp"),
  "Lux Glow Bar Collection": require("../../assets/Cleaned_Products/Lux Glow Bar Collection.webp"),
  "Lux Sandal Rs10 MLP": require("../../assets/Cleaned_Products/Lux Sandal Rs10 MLP.webp"),
  "Maggi 2-Minute Noodles": require("../../assets/Cleaned_Products/Maggi 2-Minute Noodles.webp"),
  "Maggi Pazzta": require("../../assets/Cleaned_Products/Maggi Pazzta.webp"),
  "Maharaja Orid Dhall": require("../../assets/Cleaned_Products/Maharaja Orid Dhall.webp"),
  "Marie Gold": require("../../assets/Cleaned_Products/Marie Gold.webp"),
  "Maxo Coil (Mosquito Repellent)": require("../../assets/Cleaned_Products/Maxo Coil Mosquito Repellent.webp"),
  "Maxo Genius Combi": require("../../assets/Cleaned_Products/Maxo Genius Combi.webp"),
  "Meat Masala Powder": require("../../assets/Cleaned_Products/Meat Masala Powder.webp"),
  "Medimix Soap": require("../../assets/Cleaned_Products/Medimix Soap.webp"),
  "Milk Bikis Milk Cream": require("../../assets/Cleaned_Products/Milk Bikis Milk Cream.webp"),
  "Milk Rusk / Premium Bake Rusk": require("../../assets/Cleaned_Products/Milk Rusk Premium Bake Rusk.webp"),
  "Milk Rusk Restage": require("../../assets/Cleaned_Products/Milk Rusk Restage.webp"),
  "Milma Butter": require("../../assets/Cleaned_Products/Milma Butter.webp"),
  "Milma Ghee Cake": require("../../assets/Cleaned_Products/Milma Ghee Cake.webp"),
  "Milma Ghee Cake / Choco Brownie": require("../../assets/Cleaned_Products/Milma Ghee Cake Choco Brownie.webp"),
  "Milma Paneer": require("../../assets/Cleaned_Products/Milma Paneer.webp"),
  "Mint Leaves (Puthina)": require("../../assets/Cleaned_Products/Mint Leaves Puthina.webp"),
  "Munch Chocolate Wafer": require("../../assets/Cleaned_Products/Munch Chocolate Wafer.webp"),
  "Mutton Masala Powder": require("../../assets/Cleaned_Products/Mutton Masala Powder.webp"),
  "NC Cracker Lite": require("../../assets/Cleaned_Products/NC Cracker Lite.webp"),
  "NC Thin Arrowroot Biscuit": require("../../assets/Cleaned_Products/NC Thin Arrowroot Biscuit.webp"),
  "Nescafe Classic Jar": require("../../assets/Cleaned_Products/Nescafe Classic Jar.webp"),
  "Nescafe Sunrise": require("../../assets/Cleaned_Products/Nescafe Sunrise.webp"),
  "Nirmal Urutty Rose Rice": require("../../assets/Cleaned_Products/Nirmal Urutty Rose Rice.webp"),
  "Pavithram Gingelly (Sesame) Oil": require("../../assets/Cleaned_Products/Pavithram Gingelly Sesame Oil.webp"),
  "Pears Bathing Soap Oil Clear & Glow 75g": require("../../assets/Cleaned_Products/Pears Bathing Soap Oil Clear and Glow 75g.webp"),
  "Pears Bathing Soap Pure & Gentle 60g": require("../../assets/Cleaned_Products/Pears Bathing Soap Pure and Gentle 60g.webp"),
  "Pears Bathing Soap Soft & Fresh 100g": require("../../assets/Cleaned_Products/Pears Bathing Soap Soft and Fresh 100g.webp"),
  "Pepsodent Toothpaste Germi Check Cavity Protection": require("../../assets/Cleaned_Products/Pepsodent Toothpaste Germi Check Cavity Protection.webp"),
  "Pond's Facewash Men Energy Charge 50g": require("../../assets/Cleaned_Products/Pond's Facewash Men Energy Charge 50g.webp"),
  "Pond's Facewash Pure White Anti Pollution 50g": require("../../assets/Cleaned_Products/Pond's Facewash Pure White Anti Pollution 50g.webp"),
  "Pond's Facewash White Beauty Spot Less Fairness": require("../../assets/Cleaned_Products/Pond's Facewash White Beauty Spot Less Fairness.webp"),
  "Pond's Pink Glow Face Talc 30g": require("../../assets/Cleaned_Products/Pond's Pink Glow Face Talc 30g.webp"),
  "Pond's Talcum Powder Aloe 100g": require("../../assets/Cleaned_Products/Pond's Talcum Powder Aloe 100g.webp"),
  "Pond's Talcum Powder Dreamflow 23g": require("../../assets/Cleaned_Products/Pond's Talcum Powder Dreamflow 23g.webp"),
  "Pond's Talcum Powder Dreamflow Magic 20g": require("../../assets/Cleaned_Products/Pond's Talcum Powder Dreamflow Magic 20g.webp"),
  "Ponds Aloe Cool 180g": require("../../assets/Cleaned_Products/Ponds Aloe Cool 180g.webp"),
  "Prakrithi Coconut Oil": require("../../assets/Cleaned_Products/Prakrithi Coconut Oil.webp"),
  "Pran Litchi Drink": require("../../assets/Cleaned_Products/Pran Litchi Drink.webp"),
  "Pran Pudding Jar": require("../../assets/Cleaned_Products/Pran Pudding Jar.webp"),
  "Premium Bake Rusk": require("../../assets/Cleaned_Products/Premium Bake Rusk.webp"),
  "Pringles Desi Masala": require("../../assets/Cleaned_Products/Pringles Desi Masala.webp"),
  "Pringles Original": require("../../assets/Cleaned_Products/Pringles Original.webp"),
  "Pringles Sour & Cream": require("../../assets/Cleaned_Products/Pringles Sour and Cream.webp"),
  "Pulari Rice Bran Oil": require("../../assets/Cleaned_Products/Pulari Rice Bran Oil.webp"),
  "QK Multigrain Oats": require("../../assets/Cleaned_Products/QK Multigrain Oats.webp"),
  "Quaker Oats": require("../../assets/Cleaned_Products/Quaker Oats.webp"),
  "R.G. Palm Oil": require("../../assets/Cleaned_Products/R.G. Palm Oil.webp"),
  "Raw Mango (Amrai)": require("../../assets/Fresh Vegetables/raw-mango-amrai__BeJ4UFsyYUXWKpoRNfBy.webp"),
  "Red Chilly Sauce": require("../../assets/Cleaned_Products/Red Chilly Sauce.webp"),
  "Red Label Tea Leaf Carton 250g": require("../../assets/Cleaned_Products/Red Label Tea Leaf Carton 250g.webp"),
  "Red Label Tea Leaf Poly 100g": require("../../assets/Cleaned_Products/Red Label Tea Leaf Poly 100g.webp"),
  "Red Label Tea Natural Care A Blend 250g": require("../../assets/Cleaned_Products/Red Label Tea Natural Care A Blend 250g.webp"),
  "Red Masoor Dal": require("../../assets/Cleaned_Products/Red Masoor Dal.webp"),
  "Rexona Bathing Soap Coconut And Olive Oil": require("../../assets/Cleaned_Products/Rexona Bathing Soap Coconut And Olive Oil.webp"),
  "Rin Bleach Ala Bleach 200ml": require("../../assets/Cleaned_Products/Rin Bleach Ala Bleach 200ml.webp"),
  "Rin Detergent Bar": require("../../assets/Cleaned_Products/Rin Detergent Bar.webp"),
  "Rin Detergent Powder 1kg": require("../../assets/Cleaned_Products/Rin Detergent Powder 1kg.webp"),
  "Rose Kaima Rice": require("../../assets/Cleaned_Products/Rose Kaima Rice.webp"),
  "Ruchi Gold Palm Oil": require("../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp"),
  "S S K Doppi Rice 1st": require("../../assets/Cleaned_Products/S S K Doppi Rice 1st.webp"),
  "Sambar Powder": require("../../assets/Cleaned_Products/Sambar Powder.webp"),
  "Santoor Soap (White/Set)": require("../../assets/Cleaned_Products/Santoor Soap White Set.webp"),
  "Sara Soap Podi (washing powder)": require("../../assets/Cleaned_Products/Sara Soap Podi washing powder.webp"),
  "Sarkara (Jaggery)": require("../../assets/Rice Atta & Grains/sarkara-jaggery__EOnHVrjQVeACECWMU3ot.webp"),
  "Refined Sugar": require("../../assets/Cleaned_Products/Refined Sugar.webp"),
  "Iodized Crystal Salt": require("../../assets/Cleaned_Products/Iodized Crystal Salt.webp"),
  "Sensodyne Fresh Gel Paste": require("../../assets/Cleaned_Products/Sensodyne Fresh Gel Paste.webp"),
  "Sensodyne Rapid Relief Paste": require("../../assets/Cleaned_Products/Sensodyne Rapid Relief Paste.webp"),
  "Sensodyne Sensitive Toothbrush": require("../../assets/Cleaned_Products/Sensodyne Sensitive Toothbrush.webp"),
  "Snickers": require("../../assets/Cleaned_Products/Snickers.webp"),
  "SSK Ponni Rice 1st": require("../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp"),
  "Sunfeast Marie Glucose": require("../../assets/Cleaned_Products/Sunfeast Marie Glucose.webp"),
  "Sunfeast Marie Light": require("../../assets/Cleaned_Products/Sunfeast Marie Light.webp"),
  "Sunlight Detergent Powder": require("../../assets/Cleaned_Products/Sunlight Detergent Powder.webp"),
  "Sunlight Dishwash Liquid": require("../../assets/Cleaned_Products/Sunlight Dishwash Liquid.webp"),
  "Sunsilk Hair Conditioner Smooth & Tangle Free 80ml": require("../../assets/Cleaned_Products/Sunsilk Hair Conditioner Smooth and Tangle Free 80ml.webp"),
  "Sunsilk Hair Shampoo Dream Soft & Smooth": require("../../assets/Cleaned_Products/Sunsilk Hair Shampoo Dream Soft and Smooth.webp"),
  "Sunsilk Hair Shampoo Lusciously Thick & Long": require("../../assets/Cleaned_Products/Sunsilk Hair Shampoo Lusciously Thick and Long.webp"),
  "Sunsilk Hair Shampoo Stunning Black Shine": require("../../assets/Cleaned_Products/Sunsilk Hair Shampoo Stunning Black Shine.webp"),
  "Sunsilk Thick & Long Twin (5.5+5.5)ml": require("../../assets/Cleaned_Products/Sunsilk Thick and Long Twin 5.5 Plus 5.5ml.webp"),
  "Surf Excel Detergent Bar 100g": require("../../assets/Cleaned_Products/Surf Excel Detergent Bar 100g.webp"),
  "Surf Excel Detergent Liquid Easy Wash 500ml": require("../../assets/Cleaned_Products/Surf Excel Detergent Liquid Easy Wash 500ml.webp"),
  "Surf Excel Detergent Liquid Matic Front Load Refill": require("../../assets/Cleaned_Products/Surf Excel Detergent Liquid Matic Front Load Refill.webp"),
  "Surf Excel Detergent Liquid Matic Top Load Refill": require("../../assets/Cleaned_Products/Surf Excel Detergent Liquid Matic Top Load Refill.webp"),
  "Surf Excel Detergent Powder Easy Wash": require("../../assets/Cleaned_Products/Surf Excel Detergent Powder Easy Wash.webp"),
  "Surf Excel Detergent Powder Quick Wash 1kg": require("../../assets/Cleaned_Products/Surf Excel Detergent Powder Quick Wash 1kg.webp"),
  "Taaza Elaichi 250g": require("../../assets/Cleaned_Products/Taaza Elaichi 250g.webp"),
  "Taaza Tea 100g": require("../../assets/Cleaned_Products/Taaza Tea 100g.webp"),
  "Taaza Tea Masala Chaska Elaichi 250g": require("../../assets/Cleaned_Products/Taaza Tea Masala Chaska Elaichi 250g.webp"),
  "Taj Mahal Tea Leaf 100g": require("../../assets/Cleaned_Products/Taj Mahal Tea Leaf 100g.webp"),
  "Tiger Krunch Choco": require("../../assets/Cleaned_Products/Tiger Krunch Choco.webp"),
  "TRESemme Hair Conditioner Hair Fall Defense": require("../../assets/Cleaned_Products/TRESemme Hair Conditioner Hair Fall Defense.webp"),
  "TRESemme Hair Conditioner Keratin Smooth": require("../../assets/Cleaned_Products/TRESemme Hair Conditioner Keratin Smooth.webp"),
  "TRESemme Hair Conditioner Smooth & Shine": require("../../assets/Cleaned_Products/TRESemme Hair Conditioner Smooth and Shine.webp"),
  "TRESemme Hair Shampoo Hair Fall Defense 6ml": require("../../assets/Cleaned_Products/TRESemme Hair Shampoo Hair Fall Defense 6ml.webp"),
  "TRESemme Hair Shampoo Keratin Smooth 6ml": require("../../assets/Cleaned_Products/TRESemme Hair Shampoo Keratin Smooth 6ml.webp"),
  "TRESemme Smooth & Shine LCS 6ml": require("../../assets/Cleaned_Products/TRESemme Smooth and Shine LCS 6ml.webp"),
  "True Blue Dragon Noodles": require("../../assets/Cleaned_Products/True Blue Dragon Noodles.webp"),
  "TT Asafoetida (Kayam)": require("../../assets/Cleaned_Products/TT Asafoetida Kayam.webp"),
  "Turmeric Powder": require("../../assets/Cleaned_Products/Turmeric Powder.webp"),
  "Ujala Crystal White Liquid": require("../../assets/Cleaned_Products/Ujala Crystal White Liquid.webp"),
  "Ujala Y&F Bliss/Aura Sachet": require("../../assets/Cleaned_Products/Ujala Y and F Bliss Aura Sachet.webp"),
  "UT Appam Podi": require("../../assets/Cleaned_Products/UT Appam Podi.webp"),
  "UT Puttu Podi": require("../../assets/Cleaned_Products/UT Puttu Podi.webp"),
  "UT Uppuma Rava": require("../../assets/Cleaned_Products/UT Uppuma Rava.webp"),
  "V Wash Plus 100ml": require("../../assets/Cleaned_Products/V Wash Plus 100ml.webp"),
  "Vim Bar 3x190g MPO": require("../../assets/Cleaned_Products/Vim Bar 3x190g MPO.webp"),
  "Vim Bar Tubs Anti-Smell 500g": require("../../assets/Cleaned_Products/Vim Bar Tubs Anti-Smell 500g.webp"),
  "Vim Dishwash Bar 75g": require("../../assets/Cleaned_Products/Vim Dishwash Bar 75g.webp"),
  "Vim Dishwash Bar Tub 500g": require("../../assets/Cleaned_Products/Vim Dishwash Bar Tub 500g.webp"),
  "Vim Dishwash Gel Liquid Lemon 115ml": require("../../assets/Cleaned_Products/Vim Dishwash Gel Liquid Lemon 115ml.webp"),
  "Vim Dishwash Gel Liquid Lemon 250ml": require("../../assets/Cleaned_Products/Vim Dishwash Gel Liquid Lemon 250ml.webp"),
  "Vivel / Fiama products (assorted)": require("../../assets/Cleaned_Products/Vivel Fiama products assorted.webp"),
  "Wheel Detergent Powder Blue 1kg": require("../../assets/Cleaned_Products/Wheel Detergent Powder Blue 1kg.webp"),
  "Wheel L&O Powder A+ 4kg Blue": require("../../assets/Cleaned_Products/Wheel L and O Powder A Plus 4kg Blue.webp"),
  "Women's Horlicks Caramel Pet Jar 400g": require("../../assets/Cleaned_Products/Women's Horlicks Caramel Pet Jar 400g.webp"),
  "Yardley English Rose Talc": require("../../assets/Cleaned_Products/Yardley English Rose Talc.webp"),
  "Yardley Lavender Talc": require("../../assets/Cleaned_Products/Yardley Lavender Talc.webp"),
  "Yardley Red Rose Talc": require("../../assets/Cleaned_Products/Yardley Red Rose Talc.webp"),
  "Yippee Magic Masala Noodles": require("../../assets/Cleaned_Products/Yippee Magic Masala Noodles.webp"),
  "DH Chicken Masala Idiyappam Mix": require("../../assets/Cleaned_Products/DH Idiyappam Appam Podi.webp"),
  "White Kadala / Black Benny": require("../../assets/Rice Atta & Grains/white-kadala-black-benny__DAVRPArMCFzszKirLBHZ.webp"),
  "Bourbon Neapolitan Cream (BNC) - Pineapple/Orange/Elaichi": require("../../assets/Cleaned_Products/Dark Fantasy Bourbon.webp"),
  "Dry Grapes Seedless (HD)": require("../../assets/Dry Fruits & Nuts/dry-grapes-seedless-hd__BLoT5GShMb2t70ZWRdKq.webp"),
  "Dry Grapes Seedless": require("../../assets/Dry Fruits & Nuts/dry-grapes-seedless-hd__BLoT5GShMb2t70ZWRdKq.webp"),
  "Yam (Senai Kilangu)": require("../../assets/Fresh Vegetables/yam-senai-kilangu__IJrk76dw3552oAgKdVj6.webp"),
  "Yam": require("../../assets/Fresh Vegetables/yam-senai-kilangu__IJrk76dw3552oAgKdVj6.webp"),
  "Ivy Gourd (Kovai Kai)": require("../../assets/Fresh Vegetables/ivy-gourd-kovai-kai__MsWrcPOhCz4PBNv8F2ug.webp"),
  "Ivy Gourd": require("../../assets/Fresh Vegetables/ivy-gourd-kovai-kai__MsWrcPOhCz4PBNv8F2ug.webp"),
  "Pulari Rice Bran (rice)": require("../../assets/Cleaned_Products/Bharath Doppi Rice.webp"),

  // Products from user-copied folders (Dry Fruits, Veggies, Grains, Spices)





  "Coriander Leaves": require("../../assets/Fresh Vegetables/coriander-leaves-malli__aAB6ouRQd8ijH7kzPkoF.webp"),


  "Curry Leaves": require("../../assets/Fresh Vegetables/curry-leaves-k-leaves__mp7RsN7Fr9ixuDjwTDp7.webp"),

  "Gooseberry": require("../../assets/Fresh Vegetables/gooseberry-nelli-kai__86HqFg4mAEPpPERJZrYb.webp"),




  "Long Beans": require("../../assets/Fresh Vegetables/long-beans-payeru__xIJlLuBAMpcDOhpDnSHh.webp"),

  "Raw Mango": require("../../assets/Fresh Vegetables/raw-mango-amrai__BeJ4UFsyYUXWKpoRNfBy.webp"),

  "Cheru Paruppu": require("../../assets/Rice Atta & Grains/cheru-paruppu-moong-dal__XOFSm9gAddt4WEyLcv1N.webp"),
  "Moong Dal": require("../../assets/Rice Atta & Grains/cheru-paruppu-moong-dal__XOFSm9gAddt4WEyLcv1N.webp"),

  "Kadala Paruppu": require("../../assets/Rice Atta & Grains/kadala-paruppu-chana-dal__bsJzTmYafFijM3dEAGpP.webp"),
  "Chana Dal": require("../../assets/Rice Atta & Grains/kadala-paruppu-chana-dal__bsJzTmYafFijM3dEAGpP.webp"),

  "Sarkara": require("../../assets/Rice Atta & Grains/sarkara-jaggery__EOnHVrjQVeACECWMU3ot.webp"),
  "Jaggery": require("../../assets/Rice Atta & Grains/sarkara-jaggery__EOnHVrjQVeACECWMU3ot.webp"),





};

// Direct Firestore Product ID mapping for newly user-provided local assets
export const productImagesById = {
  // Dry Fruits & Nuts
  "DOCUVuLTTkIO0DCgtTH9": require("../../assets/Dry Fruits & Nuts/cashew-split__DOCUVuLTTkIO0DCgtTH9.webp"),
  "Ym4Ei0GmBtFhGsSSwYFs": require("../../assets/Dry Fruits & Nuts/dates-syrup__Ym4Ei0GmBtFhGsSSwYFs.webp"),
  "BLoT5GShMb2t70ZWRdKq": require("../../assets/Dry Fruits & Nuts/dry-grapes-seedless-hd__BLoT5GShMb2t70ZWRdKq.webp"),

  // Fresh Vegetables
  "uqYEvkNgva7SIgQ5orFn": require("../../assets/Fresh Vegetables/beans__uqYEvkNgva7SIgQ5orFn.webp"),
  "cPPZggLI450T7cE3Diia": require("../../assets/Fresh Vegetables/beet-root__cPPZggLI450T7cE3Diia.webp"),
  "Cjp3EMDiYrwMlhV1o640": require("../../assets/Fresh Vegetables/brinjal__Cjp3EMDiYrwMlhV1o640.webp"),
  "aAB6ouRQd8ijH7kzPkoF": require("../../assets/Fresh Vegetables/coriander-leaves-malli__aAB6ouRQd8ijH7kzPkoF.webp"),
  "vk2AoARLUO7mwJ5DRLys": require("../../assets/Fresh Vegetables/cucumber__vk2AoARLUO7mwJ5DRLys.webp"),
  "mp7RsN7Fr9ixuDjwTDp7": require("../../assets/Fresh Vegetables/curry-leaves-k-leaves__mp7RsN7Fr9ixuDjwTDp7.webp"),
  "embA4YBbzdWPk6HiKodE": require("../../assets/Fresh Vegetables/ginger__embA4YBbzdWPk6HiKodE.webp"),
  "86HqFg4mAEPpPERJZrYb": require("../../assets/Fresh Vegetables/gooseberry-nelli-kai__86HqFg4mAEPpPERJZrYb.webp"),
  "prod-green-chilli": require("../../assets/Fresh Vegetables/green-chilli__prod-green-chilli.webp"),
  "e2BR5zJ1G2TFJ8uovSJI": require("../../assets/Fresh Vegetables/green-chilly__e2BR5zJ1G2TFJ8uovSJI.webp"),
  "MsWrcPOhCz4PBNv8F2ug": require("../../assets/Fresh Vegetables/ivy-gourd-kovai-kai__MsWrcPOhCz4PBNv8F2ug.webp"),
  "Xs96pFXTQuEtroJX1bTO": require("../../assets/Fresh Vegetables/ladies-finger__Xs96pFXTQuEtroJX1bTO.webp"),
  "Ylce3S5MpG2p29IT3Rfr": require("../../assets/Fresh Vegetables/lemon__Ylce3S5MpG2p29IT3Rfr.webp"),
  "xIJlLuBAMpcDOhpDnSHh": require("../../assets/Fresh Vegetables/long-beans-payeru__xIJlLuBAMpcDOhpDnSHh.webp"),
  "Q9X0g6BEyT1AA6DwHv2e": require("../../assets/Fresh Vegetables/mango__Q9X0g6BEyT1AA6DwHv2e.webp"),
  "prod-onion": require("../../assets/Fresh Vegetables/onion__prod-onion.webp"),
  "ywIos8c1XC5PEAUUZ8f0": require("../../assets/Fresh Vegetables/potato__ywIos8c1XC5PEAUUZ8f0.webp"),
  "BeJ4UFsyYUXWKpoRNfBy": require("../../assets/Fresh Vegetables/raw-mango-amrai__BeJ4UFsyYUXWKpoRNfBy.webp"),
  "prod-sweet-corn": require("../../assets/Fresh Vegetables/sweet-corn__prod-sweet-corn.webp"),
  "prod-tomato-local": require("../../assets/Fresh Vegetables/tomato-local__prod-tomato-local.webp"),
  "IJrk76dw3552oAgKdVj6": require("../../assets/Fresh Vegetables/yam-senai-kilangu__IJrk76dw3552oAgKdVj6.webp"),

  // Rice Atta & Grains
  "XOFSm9gAddt4WEyLcv1N": require("../../assets/Rice Atta & Grains/cheru-paruppu-moong-dal__XOFSm9gAddt4WEyLcv1N.webp"),
  "bsJzTmYafFijM3dEAGpP": require("../../assets/Rice Atta & Grains/kadala-paruppu-chana-dal__bsJzTmYafFijM3dEAGpP.webp"),
  "EOnHVrjQVeACECWMU3ot": require("../../assets/Rice Atta & Grains/sarkara-jaggery__EOnHVrjQVeACECWMU3ot.webp"),
  "DAVRPArMCFzszKirLBHZ": require("../../assets/Rice Atta & Grains/white-kadala-black-benny__DAVRPArMCFzszKirLBHZ.webp"),

  // Spices & Masala
  "vz0IU7RfU2jzaP3Y2WOm": require("../../assets/Spices & Masala/black-pepper-powder__vz0IU7RfU2jzaP3Y2WOm.webp"),
  "TCQzph6z2cm8ypODaKU1": require("../../assets/Spices & Masala/chicken-masala-powder__TCQzph6z2cm8ypODaKU1.webp"),
  "ZH7rtHh55An2JyyQ98qE": require("../../assets/Spices & Masala/chilli-powder__ZH7rtHh55An2JyyQ98qE.webp"),
  "2foB8BGN2Uyb9tlm7Euf": require("../../assets/Spices & Masala/coriander-powder__2foB8BGN2Uyb9tlm7Euf.webp"),
  "LJDZij61suRxIHo3r1MN": require("../../assets/Spices & Masala/egg-masala-powder__LJDZij61suRxIHo3r1MN.webp"),
};

// Every seeded product's `images` array is empty ([]) unless an admin has uploaded a
// real photo through the admin portal's ProductForm — that's how we tell "no admin photo
// yet" apart from "a real photo someone deliberately uploaded."
const GENERIC_STOCK_PHOTO = /res\.cloudinary\.com\/demo\//;

// Resolves the best available image source for a product:
//  1. Locally-bundled require() asset matched by product ID or exact product name.
//  2. Real admin-uploaded photo (item.images[0]) via optimizeCloudinaryUrl().
//  3. Fallback case-insensitive product name matching.
//  4. null — caller renders its own empty-state icon.
export function getProductImageSource(item, width = 320) {
  if (!item) return null;

  // 1. Direct ID lookup in bundled assets (including newly provided assets)
  const id = item?.id || item?.productId;
  if (id && productImagesById[id]) {
    return productImagesById[id];
  }

  // 2. Direct Name lookup in bundled assets
  const name = (item?.name || '').trim();
  if (name && productImages[name]) {
    return productImages[name];
  }

  // 3. Fallback case-insensitive search in bundled assets
  if (name) {
    const lowerName = name.toLowerCase();
    const foundKey = Object.keys(productImages).find(
      (k) => k.toLowerCase() === lowerName || lowerName.includes(k.toLowerCase())
    );
    if (foundKey) return productImages[foundKey];
  }

  // 4. Remote URI from Cloudinary (admin uploads or synced catalog images)
  const rawUri =
    (Array.isArray(item?.images) ? item.images[0] : null) ||
    (typeof item?.images === 'string' ? item.images : null) ||
    item?.image ||
    item?.photo ||
    item?.imageUrl ||
    item?.uri;

  if (rawUri && typeof rawUri === 'string' && rawUri.trim().length > 0) {
    const trimmed = rawUri.trim();
    if (!GENERIC_STOCK_PHOTO.test(trimmed)) {
      return { uri: optimizeCloudinaryUrl(trimmed, width) };
    }
  }

  // 5. Fallback generic uri if available
  if (rawUri && typeof rawUri === 'string' && rawUri.trim().length > 0) {
    return { uri: optimizeCloudinaryUrl(rawUri.trim(), width) };
  }

  return null;
}

export default productImages;
