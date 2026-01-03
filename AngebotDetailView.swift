import SwiftUI

struct AngebotDetailView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: Layout.spacing16) {
                TopBar()
                SegmentTabs()
                OfferSummaryCard()
                ContactRow()
                OfferItemsCard()
            }
            .padding(.bottom, Layout.spacing24)
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
}

private enum Layout {
    static let spacing4: CGFloat = 4
    static let spacing6: CGFloat = 6
    static let spacing8: CGFloat = 8
    static let spacing10: CGFloat = 10
    static let spacing12: CGFloat = 12
    static let spacing14: CGFloat = 14
    static let spacing16: CGFloat = 16
    static let spacing18: CGFloat = 18
    static let spacing20: CGFloat = 20
    static let spacing24: CGFloat = 24
    static let spacing28: CGFloat = 28
    static let spacing32: CGFloat = 32
    static let cornerRadius12: CGFloat = 12
    static let cornerRadius14: CGFloat = 14
    static let cornerRadius16: CGFloat = 16
    static let cornerRadius20: CGFloat = 20
    static let cardShadow = Color.black.opacity(0.08)
    static let sheetShadow = Color.black.opacity(0.12)
    static let accentBlue = Color(red: 0.24, green: 0.54, blue: 0.93)
    static let accentBlueLight = Color(red: 0.90, green: 0.95, blue: 1.0)
    static let accentBluePill = Color(red: 0.92, green: 0.96, blue: 1.0)
}

private struct TopBar: View {
    var body: some View {
        VStack(spacing: Layout.spacing12) {
            HStack {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color(UIColor.label))
                Text("Angebot AN-0005")
                    .font(.system(.title3, weight: .semibold))
                    .foregroundColor(Color(UIColor.label))
                Spacer()
                Image(systemName: "ellipsis")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color(UIColor.label))
            }
            .padding(.horizontal, Layout.spacing16)
            .padding(.top, Layout.spacing12)
        }
        .padding(.bottom, Layout.spacing4)
        .background(Color(UIColor.systemBackground))
    }
}

private struct SegmentTabs: View {
    var body: some View {
        HStack(spacing: Layout.spacing8) {
            tabButton(title: "Details", isActive: true)
            tabButton(title: "Aktivitäten", isActive: false)
        }
        .padding(Layout.spacing4)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(Capsule())
        .padding(.horizontal, Layout.spacing16)
    }

    private func tabButton(title: String, isActive: Bool) -> some View {
        VStack(spacing: Layout.spacing4) {
            Text(title)
                .font(.system(.subheadline, weight: .semibold))
                .foregroundColor(isActive ? Layout.accentBlue : Color(UIColor.secondaryLabel))
                .frame(maxWidth: .infinity)
            if isActive {
                Rectangle()
                    .fill(Layout.accentBlue)
                    .frame(height: 2)
                    .cornerRadius(1)
            } else {
                Rectangle()
                    .fill(Color.clear)
                    .frame(height: 2)
            }
        }
        .padding(.vertical, Layout.spacing8)
        .padding(.horizontal, Layout.spacing14)
        .background(isActive ? Layout.accentBluePill : Color.clear)
        .clipShape(Capsule())
    }
}

private struct OfferSummaryCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacing16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: Layout.spacing6) {
                    Text("Zink GmbH")
                        .font(.system(.title3, weight: .semibold))
                        .foregroundColor(Color(UIColor.label))
                    Text("Meisenstraße")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.secondaryLabel))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: Layout.spacing6) {
                    Text("ANGEBOT")
                        .font(.system(.subheadline, weight: .semibold))
                        .foregroundColor(Color(UIColor.label))
                    Text("Nr: AN-0005")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.secondaryLabel))
                }
            }

            HStack(alignment: .top, spacing: Layout.spacing16) {
                VStack(alignment: .leading, spacing: Layout.spacing12) {
                    HStack(alignment: .top, spacing: Layout.spacing10) {
                        Image(systemName: "calendar")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(Layout.accentBlue)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: Layout.spacing4) {
                            Text("Datum:")
                                .font(.system(.footnote, weight: .semibold))
                                .foregroundColor(Color(UIColor.secondaryLabel))
                            Text("27. Dezember 2025")
                                .font(.system(.subheadline, weight: .semibold))
                                .foregroundColor(Layout.accentBlue)
                        }
                    }
                    HStack(alignment: .top, spacing: Layout.spacing10) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(Layout.accentBlue)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: Layout.spacing4) {
                            Text("Gültig bis:")
                                .font(.system(.footnote, weight: .semibold))
                                .foregroundColor(Color(UIColor.secondaryLabel))
                            Text("10. Januar 2026")
                                .font(.system(.subheadline, weight: .semibold))
                                .foregroundColor(Layout.accentBlue)
                        }
                    }
                }
                .padding(Layout.spacing12)
                .background(Layout.accentBlueLight)
                .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius12, style: .continuous))

                VStack(alignment: .trailing, spacing: Layout.spacing8) {
                    Text("Datum: 27.12.2025")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.label))
                    Text("Gültig bis: 10.01.2026")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.label))
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            Divider()

            HStack {
                Text("Zwischensumme:")
                    .font(.system(.subheadline, weight: .regular))
                    .foregroundColor(Color(UIColor.secondaryLabel))
                Spacer()
                Text("10,00 €")
                    .font(.system(.headline, weight: .semibold))
                    .foregroundColor(Color(UIColor.label))
            }
        }
        .padding(Layout.spacing16)
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius16, style: .continuous))
        .shadow(color: Layout.cardShadow, radius: 12, x: 0, y: 6)
        .padding(.horizontal, Layout.spacing16)
    }
}

private struct ContactRow: View {
    var body: some View {
        HStack(spacing: Layout.spacing12) {
            ZStack {
                Circle()
                    .fill(Color(UIColor.secondarySystemBackground))
                    .frame(width: 44, height: 44)
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 36))
                    .foregroundColor(Color(UIColor.tertiaryLabel))
            }
            VStack(alignment: .leading, spacing: Layout.spacing4) {
                Text("Michelle Zink")
                    .font(.system(.headline, weight: .semibold))
                    .foregroundColor(Color(UIColor.label))
                Text("Stadtgraben 61")
                    .font(.system(.subheadline, weight: .regular))
                    .foregroundColor(Color(UIColor.secondaryLabel))
            }
            Spacer()
        }
        .padding(.horizontal, Layout.spacing16)
    }
}

private struct OfferItemsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacing16) {
            Text("Gerne unterbreiten wir Ihnen folgendes Angebot:")
                .font(.system(.subheadline, weight: .regular))
                .foregroundColor(Color(UIColor.secondaryLabel))

            VStack(spacing: Layout.spacing12) {
                tableHeader()
                Divider()
                tableRow()
            }

            Divider()

            VStack(alignment: .trailing, spacing: Layout.spacing12) {
                HStack {
                    Spacer()
                    Text("Betrag:")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.secondaryLabel))
                    Text("10,00 €")
                        .font(.system(.subheadline, weight: .semibold))
                        .foregroundColor(Color(UIColor.label))
                }
                HStack {
                    Spacer()
                    Text("Wartemt")
                        .font(.system(.subheadline, weight: .regular))
                        .foregroundColor(Color(UIColor.secondaryLabel))
                    Text("10,00 €")
                        .font(.system(.subheadline, weight: .semibold))
                        .foregroundColor(Color(UIColor.label))
                }
            }
            .frame(maxWidth: .infinity)

            BottomActionsSheet()
                .padding(.top, Layout.spacing4)
        }
        .padding(Layout.spacing16)
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius16, style: .continuous))
        .shadow(color: Layout.cardShadow, radius: 12, x: 0, y: 6)
        .padding(.horizontal, Layout.spacing16)
    }

    private func tableHeader() -> some View {
        HStack(spacing: Layout.spacing8) {
            Text("Beschreibung")
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(Color(UIColor.secondaryLabel))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Menge")
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(Color(UIColor.secondaryLabel))
                .frame(width: 64, alignment: .leading)
            Text("Einzelpreis")
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(Color(UIColor.secondaryLabel))
                .frame(width: 88, alignment: .trailing)
            Text("Gesamt")
                .font(.system(.footnote, weight: .semibold))
                .foregroundColor(Color(UIColor.secondaryLabel))
                .frame(width: 72, alignment: .trailing)
        }
    }

    private func tableRow() -> some View {
        HStack(spacing: Layout.spacing8) {
            Text("Malen")
                .font(.system(.subheadline, weight: .regular))
                .foregroundColor(Color(UIColor.label))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("1 Std")
                .font(.system(.subheadline, weight: .regular))
                .foregroundColor(Color(UIColor.label))
                .frame(width: 64, alignment: .leading)
            Text("10,00 €")
                .font(.system(.subheadline, weight: .regular))
                .foregroundColor(Color(UIColor.secondaryLabel))
                .frame(width: 88, alignment: .trailing)
            Text("10,00 €")
                .font(.system(.subheadline, weight: .semibold))
                .foregroundColor(Color(UIColor.label))
                .frame(width: 72, alignment: .trailing)
        }
    }
}

private struct BottomActionsSheet: View {
    var body: some View {
        VStack(spacing: Layout.spacing12) {
            Capsule()
                .fill(Color(UIColor.tertiarySystemFill))
                .frame(width: 36, height: 4)
                .padding(.top, Layout.spacing8)

            VStack(spacing: Layout.spacing12) {
                Button(action: {}) {
                    HStack(spacing: Layout.spacing10) {
                        Image(systemName: "doc.fill")
                        Text("PDF herunterladen")
                            .font(.system(.headline, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Layout.accentBlue)
                    .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius12, style: .continuous))
                }

                Button(action: {}) {
                    HStack(spacing: Layout.spacing10) {
                        Image(systemName: "envelope")
                        Text("Per E-Mail senden")
                            .font(.system(.headline, weight: .semibold))
                    }
                    .foregroundColor(Color(UIColor.label))
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(UIColor.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.cornerRadius12, style: .continuous)
                            .stroke(Color(UIColor.separator), lineWidth: 1)
                    )
                }

                Button(action: {}) {
                    HStack(spacing: Layout.spacing10) {
                        Image(systemName: "xmark")
                        Text("Schließen")
                            .font(.system(.headline, weight: .semibold))
                    }
                    .foregroundColor(Color(UIColor.secondaryLabel))
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color(UIColor.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: Layout.cornerRadius12, style: .continuous)
                            .stroke(Color(UIColor.separator), lineWidth: 1)
                    )
                }
            }
            .padding(.bottom, Layout.spacing12)
            .padding(.horizontal, Layout.spacing16)
        }
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius16, style: .continuous))
        .shadow(color: Layout.sheetShadow, radius: 10, x: 0, y: 5)
    }
}

#Preview("AngebotDetailView") {
    AngebotDetailView()
        .previewDevice("iPhone 15")
}
