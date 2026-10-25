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

const PRIVACY_SECTIONS = [
  {
    id: 'p1',
    number: '01',
    title: 'Who we are',
    paragraphs: [
      'M S TRADERS, trading as MS Traders, HV76+F39, Menamkulam, Thiruvananthapuram, Kerala 695582, is the Data Fiduciary responsible for your personal data.',
    ],
  },
  {
    id: 'p2',
    number: '02',
    title: 'What we collect',
    bullets: [
      'Account details: your name, mobile number and email (optional).',
      'Delivery details: saved addresses, house or flat number, landmark and the map pin you set.',
      'Location: your device’s precise location while you are using the app, if you allow it.',
      'Orders: items bought, amounts, delivery slots, coupons and MS Club status.',
      'Payments: payment method, transaction ID and status. Card numbers and UPI PINs stay with our payment partner.',
      'Support: messages, and photos you send when reporting missing or damaged items.',
      'Device and app data: device model, operating system, app version, crash logs and notification token.',
    ],
  },
  {
    id: 'p3',
    number: '03',
    title: 'Why we use it',
    bullets: [
      'To create your account and verify your number with an OTP.',
      'To check that your address is in our delivery area, work out the delivery fee and deliver your order.',
      'To process payments and refunds and to issue GST invoices.',
      'To send order updates by SMS or notification, and offers only if you have turned offer notifications on.',
      'To prevent fraud and misuse of coupons, and to keep the app secure.',
      'To fix bugs and improve the app using aggregated usage data.',
    ],
  },
  {
    id: 'p4',
    number: '04',
    title: 'Location data',
    bullets: [
      'We ask for location permission only to find your address and place your delivery pin. You can say no and enter your address by hand instead.',
      'We use your location only while the app is open. The customer app doesn’t track you in the background.',
      'Your delivery partner sees your pinned address only while delivering your order.',
      'You can turn location off at any time in your phone’s settings.',
    ],
  },
  {
    id: 'p5',
    number: '05',
    title: 'Who we share it with',
    bullets: [
      'Delivery partners: your name, delivery address, map pin and a phone number to reach you, only for that order.',
      'Payment partners: what they need to process payments and refunds.',
      'Service providers: cloud hosting, SMS/OTP, maps and crash-reporting services that process data for us under contract and follow our instructions.',
      'Authorities: when the law, a court or a government agency requires it.',
      'We do not sell or rent your personal data to anyone.',
    ],
  },
  {
    id: 'p6',
    number: '06',
    title: 'How long we keep it',
    bullets: [
      'Account data stays while your account is active.',
      'Order and invoice records are kept for as long as GST and tax laws require (usually 6 to 8 years).',
      'Support photos are deleted 90 days after the issue is closed.',
      'When you delete your account, we erase or anonymise your personal data unless the law requires us to keep it.',
    ],
  },
  {
    id: 'p7',
    number: '07',
    title: 'How we protect it',
    paragraphs: [
      'Data is encrypted in transit (HTTPS) and stored with access controls. Only staff who need it for their work can see it. If a breach affects you, we will notify you and the Data Protection Board of India as the law requires.',
    ],
  },
  {
    id: 'p8',
    number: '08',
    title: 'Your rights',
    bullets: [
      'Access: ask for a summary of the personal data we hold about you.',
      'Correct or update: edit your profile and addresses in the app, or ask us.',
      'Erase: delete your account from Account › Delete account, or ask us.',
      'Withdraw consent: turn off offer notifications or location at any time. Some services may then stop working.',
      'Nominate: name someone to exercise these rights for you if you die or become unable to.',
      'Complain: contact our Grievance Officer. If you are not satisfied, you can approach the Data Protection Board of India.',
    ],
  },
  {
    id: 'p9',
    number: '09',
    title: 'Children',
    paragraphs: [
      'The app is meant for adults. We don’t knowingly collect data from anyone under 18 without verifiable consent from a parent or guardian. If you think a child has given us data, contact us and we will delete it.',
    ],
  },
  {
    id: 'p10',
    number: '10',
    title: 'Notifications and analytics',
    paragraphs: [
      'We send order and delivery notifications because they are needed to complete your order. Offer notifications are optional and can be switched off in Account. We use analytics to see how the app is used, but not to build advertising profiles.',
    ],
  },
  {
    id: 'p11',
    number: '11',
    title: 'Changes to this policy',
    paragraphs: [
      'When we update this policy, we change the date at the top and show a notice in the app before major changes take effect.',
    ],
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
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

        <Text style={styles.headerTitle}>Privacy Policy</Text>

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
        {/* Top notice highlight card matching Image 3 & 4 style */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeIconBox}>
            <ShieldCheck size={22} color="#087f46" strokeWidth={2.4} />
          </View>
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>Your privacy is protected</Text>
            <Text style={styles.noticeDesc}>
              We collect only what is needed to deliver your groceries and never sell your personal data.
            </Text>
          </View>
        </View>

        {/* Contents Index Card matching Image 5 */}
        <View style={styles.card}>
          <Text style={styles.contentsTitle}>Contents</Text>
          <View style={styles.contentsList}>
            {PRIVACY_SECTIONS.map((section, idx) => (
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

        {/* 11 Detailed Section Cards */}
        {PRIVACY_SECTIONS.map((section, idx) => (
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
          <Text style={styles.grievanceHeader}>Grievance Officer (Data Protection)</Text>
          <Text style={styles.grievanceIntro}>
            For questions about your data or to use any of your rights, contact:
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

        {/* Navigation to Terms of Service matching Image 3 */}
        <Pressable
          onPress={() => navigation.navigate('Terms')}
          style={({ pressed }) => [
            styles.bottomNavPill,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.bottomNavPillText}>Read our Terms of Service</Text>
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
    paddingVertical: 4,
    width: '100%',
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
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
  },
  sectionNumberText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#047857',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
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
    color: '#047857',
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
