import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  HelpCircle,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
} from '../components/icons';
import { fonts } from '../theme/typography';

const TERMS_SECTIONS = [
  {
    id: 't1',
    number: '01',
    title: 'About MS Traders',
    paragraphs: [
      'MS Traders is a grocery store in Menamkulam, Thiruvananthapuram, operated by M S TRADERS ("MS Traders", "we", "us"). We sell groceries, fresh produce, household and personal-care products from our own store and deliver them to you.',
    ],
    bullets: [
      'GSTIN: 32AIOPH1746G1ZF',
      'License Number: 113230001250',
      'Registered address: HV76+F39, Menamkulam, Thiruvananthapuram, Kerala 695582',
    ],
  },
  {
    id: 't2',
    number: '02',
    title: 'Your account',
    bullets: [
      'You must be 18 or older to create an account. Anyone younger may order only with a parent or guardian.',
      'Sign in with your mobile number and the one-time password (OTP) we send. Never share your OTP with anyone, including people who say they are from MS Traders.',
      'Keep your name, number and addresses accurate. You are responsible for orders placed from your account.',
      'We may suspend accounts used for fraud, fake refund claims or abuse of offers.',
    ],
  },
  {
    id: 't3',
    number: '03',
    title: 'Delivery area, slots and charges',
    paragraphs: [
      'We deliver only to addresses within 5 km of our store. Place your map pin on your exact door so our delivery partner can find you.',
    ],
    bullets: [
      'Delivery slots: 9–11 AM, 11 AM–1 PM, 4–6 PM and 6–8 PM. Slots fill up and may change on holidays.',
      'Delivery fee: ₹20 up to 2 km, ₹40 from 2 to 5 km. Free delivery on orders ₹3000 and above (orders of ₹3000 or more are delivered free). MS Club members get free delivery.',
      'Someone must be available to receive the order. If we can’t reach you, we may return the order to the store and treat it as cancelled.',
      'Delays caused by weather, traffic, strikes or events outside our control are not a breach of these terms.',
    ],
  },
  {
    id: 't4',
    number: '04',
    title: 'Products, prices and availability',
    bullets: [
      'All prices are in Indian rupees and include GST. We never charge more than the MRP printed on a pack.',
      'Fruits, vegetables and loose items are sold by approximate weight. The final weight may vary by up to ±10%, and you pay only for what is packed.',
      'Product photos are for illustration. Packaging and brand designs may differ from the image.',
      'If an item runs out after you order, we will remove it and refund it, or offer a substitute only if you agree.',
      'If an item is listed at an obviously wrong price because of an error, we may cancel that item and refund you in full.',
    ],
  },
  {
    id: 't5',
    number: '05',
    title: 'Orders and payment',
    bullets: [
      'Your order is confirmed once you see the order confirmation screen. We may still cancel it if an item is unavailable, your address is outside our area, or payment fails.',
      'We accept UPI (Google Pay, PhonePe, Paytm, BHIM), debit and credit cards, and net banking.',
      'Card and UPI payments are handled securely by our payment gateway. We never see or store your card number, CVV or UPI PIN.',
      'Invoices are available in the app under My orders.',
    ],
  },
  {
    id: 't6',
    number: '06',
    title: 'Cancellations',
    bullets: [
      'You can cancel free of charge from the order screen until we start packing.',
      'Once the order is packed or out for delivery, it can’t be cancelled. You can refuse damaged items at the door.',
      'If we cancel your order, we refund the full amount, including the delivery fee.',
    ],
  },
  {
    id: 't7',
    number: '07',
    title: 'Returns and refunds',
    bullets: [
      'Missing, wrong, damaged or expired items: report them in the app within 24 hours of delivery, with a photo where possible.',
      'Fresh produce, dairy, bakery and frozen items should be checked at the door. We accept returns of these only if they arrive spoiled or damaged.',
      'Opened, used or tampered products can’t be returned unless they were defective.',
      'Approved refunds go back to your original payment method within 5–7 working days. Cash-on-delivery refunds are sent to your UPI ID or bank account.',
    ],
  },
  {
    id: 't8',
    number: '08',
    title: 'Offers, coupons and MS Club',
    bullets: [
      'Coupons have their own conditions, such as a minimum order value or expiry date, shown before you apply them.',
      'Only one coupon can be used per order, and coupons can’t be exchanged for cash.',
      'MS Club is a paid monthly membership. Benefits apply only while it is active, and the fee is not refundable once the month has started.',
      'We may change or end an offer at any time. Orders already placed keep the offer they were placed with.',
    ],
  },
  {
    id: 't9',
    number: '09',
    title: 'Fair use',
    bullets: [
      'Don’t place orders for resale in bulk, misuse offers with multiple accounts, or make false refund claims.',
      'Treat our delivery partners and staff with respect. We may refuse service after abusive behaviour.',
      'Don’t try to copy, disrupt or reverse-engineer the app.',
    ],
  },
  {
    id: 't10',
    number: '10',
    title: 'Our liability',
    paragraphs: [
      'We take care to deliver the right products in good condition. If something goes wrong, our liability for any order is limited to the amount you paid for that order. This does not limit your rights under the Consumer Protection Act, 2019.',
    ],
  },
  {
    id: 't11',
    number: '11',
    title: 'Complaints and disputes',
    paragraphs: [
      'Contact our Grievance Officer using the details below. We acknowledge every complaint within 48 hours and aim to resolve it within one month, as required by the Consumer Protection (E-Commerce) Rules, 2020.',
      'These terms are governed by the laws of India. Courts in Thiruvananthapuram, Kerala have jurisdiction, without limiting your right to approach a consumer commission.',
    ],
  },
  {
    id: 't12',
    number: '12',
    title: 'Changes to these terms',
    paragraphs: [
      'We may update these terms when our services or the law change. We will show a notice in the app before major changes take effect. Continuing to use the app after that means you accept the updated terms.',
    ],
  },
];

export default function TermsScreen({ navigation }) {
  const scrollRef = useRef(null);
  const sectionPositions = useRef({});

  const scrollToSection = (index) => {
    const y = sectionPositions.current[index];
    if (typeof y === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openEmail = () => {
    Linking.openURL('mailto:hassanramla31@gmail.com');
  };

  const openPhone = () => {
    Linking.openURL('tel:+919037655180');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header with Back button and Question Mark redirecting to Help & Support */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.headerButton}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Terms of Service</Text>

        <Pressable
          onPress={() => navigation.navigate('HelpSupport')}
          hitSlop={12}
          style={styles.headerButton}
          accessibilityLabel="Help and support"
        >
          <HelpCircle size={22} color="#0f172a" strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top notice highlight card matching Image 3 */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeIconBox}>
            <ShieldCheck size={22} color="#087f46" strokeWidth={2.4} />
          </View>
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>You can cancel before packing</Text>
            <Text style={styles.noticeDesc}>
              Once your order is out for delivery it can no longer be cancelled.
            </Text>
          </View>
        </View>

        {/* Contents Index Card matching Image 5 */}
        <View style={styles.card}>
          <Text style={styles.contentsTitle}>Contents</Text>
          <View style={styles.contentsList}>
            {TERMS_SECTIONS.map((section, idx) => (
              <Pressable
                key={section.id}
                onPress={() => scrollToSection(idx)}
                style={({ pressed }) => [
                  styles.contentPressable,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <View style={styles.contentRow}>
                  <Text style={styles.contentNum}>{section.number}</Text>
                  <Text numberOfLines={1} style={styles.contentLabel}>
                    {section.title}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 12 Detailed Section Cards */}
        {TERMS_SECTIONS.map((section, idx) => (
          <View
            key={section.id}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              sectionPositions.current[idx] = layout.y;
            }}
            style={styles.card}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionNumberBadge}>
                <Text style={styles.sectionNumberText}>{section.number}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.paragraphs?.map((p, pIdx) => (
              <Text key={`p-${pIdx}`} style={styles.sectionParagraph}>
                {p}
              </Text>
            ))}

            {section.bullets?.map((bullet, bIdx) => {
              const colonIndex = bullet.indexOf(':');
              if (colonIndex !== -1 && colonIndex < 35) {
                const label = bullet.slice(0, colonIndex + 1);
                const rest = bullet.slice(colonIndex + 1);
                return (
                  <View key={`b-${bIdx}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.bulletHeadingBold}>{label}</Text>
                      <Text style={styles.bulletRestRegular}>{rest}</Text>
                    </Text>
                  </View>
                );
              }
              return (
                <View key={`b-${bIdx}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* Grievance Officer Card matching Image 3 */}
        <View style={styles.card}>
          <Text style={styles.grievanceHeader}>Grievance Officer (Customer Care)</Text>
          <Text style={styles.grievanceIntro}>
            For complaints about an order, a refund or these terms, contact:
          </Text>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Name</Text>
            <Text style={styles.tableValueDark}>ANSAR HASSAN, Grievance Officer</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Email</Text>
            <Pressable onPress={openEmail} hitSlop={6} style={{ flex: 1 }}>
              <Text style={styles.tableValueDark}>hassanramla31@gmail.com</Text>
            </Pressable>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Phone</Text>
            <Pressable onPress={openPhone} hitSlop={6} style={{ flex: 1 }}>
              <Text style={styles.tableValueDark}>
                +91 9037655180 · 9 AM – 6 PM, Mon–Sat
              </Text>
            </Pressable>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Address</Text>
            <Text style={styles.tableValueDark}>
              M S TRADERS, HV76+F39, Menamkulam, Thiruvananthapuram, Kerala 695582
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate('HelpSupport')}
            style={({ pressed }) => [
              styles.chatSupportBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <MessageSquare size={17} color="#047857" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={styles.chatSupportBtnText}>Chat with support</Text>
          </Pressable>
        </View>

        {/* Navigation to Privacy Policy matching Image 3 */}
        <Pressable
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={({ pressed }) => [
            styles.bottomNavPill,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.bottomNavPillText}>Read our Privacy Policy</Text>
          <ChevronRight size={16} color="#0f172a" strokeWidth={2.4} style={{ marginLeft: 6 }} />
        </Pressable>

        {/* Back to top Link matching Image 3 */}
        <Pressable onPress={scrollToTop} hitSlop={12} style={styles.backToTopContainer}>
          <Text style={styles.backToTopLink}>Back to top</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f6f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8eee8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  noticeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 3,
  },
  noticeDesc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf2ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  contentsTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#0f172a',
    marginBottom: 18,
  },
  contentsList: {
    gap: 12,
  },
  contentPressable: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  contentNum: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#047857',
    width: 32,
    marginRight: 14,
  },
  contentLabel: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#0f172a',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionNumberBadge: {
    backgroundColor: '#eaf6ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  sectionNumberText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#087f46',
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: '#0f172a',
    flex: 1,
  },
  sectionParagraph: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 21,
    color: '#334155',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 16,
    color: '#087f46',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  bulletHeadingBold: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#0f172a',
  },
  bulletRestRegular: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#334155',
  },
  grievanceHeader: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0f172a',
    marginBottom: 8,
  },
  grievanceIntro: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tableLabel: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#64748b',
    width: 76,
  },
  tableValueDark: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#0f172a',
    flex: 1,
    lineHeight: 19,
  },
  chatSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf6ee',
    borderRadius: 14,
    height: 48,
    marginTop: 10,
  },
  chatSupportBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#047857',
  },
  bottomNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  bottomNavPillText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#0f172a',
  },
  backToTopContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 28,
  },
  backToTopLink: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#047857',
  },
});
