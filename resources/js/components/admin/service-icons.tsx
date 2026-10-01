import {
    ActivityIcon,
    AwardIcon,
    BadgePercentIcon,
    BanknoteIcon,
    BarcodeIcon,
    BikeIcon,
    BoxIcon,
    BoxesIcon,
    BrushIcon,
    CalendarIcon,
    CircleDollarSignIcon,
    ClockIcon,
    CreditCardIcon,
    CrownIcon,
    DumbbellIcon,
    FlagIcon,
    FlameIcon,
    FootprintsIcon,
    GiftIcon,
    GoalIcon,
    HammerIcon,
    HandCoinsIcon,
    HeadsetIcon,
    HeartIcon,
    LayersIcon,
    type LucideIcon,
    MailIcon,
    MapPinIcon,
    MedalIcon,
    MessageSquareIcon,
    PackageIcon,
    PaletteIcon,
    PenToolIcon,
    PhoneIcon,
    PrinterIcon,
    QrCodeIcon,
    ReceiptIcon,
    RefreshCwIcon,
    RulerIcon,
    ScissorsIcon,
    SearchIcon,
    SettingsIcon,
    ShieldCheckIcon,
    ShirtIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    SparklesIcon,
    StampIcon,
    StarIcon,
    StoreIcon,
    TagIcon,
    TagsIcon,
    TargetIcon,
    TicketPercentIcon,
    TimerIcon,
    TrophyIcon,
    TruckIcon,
    UsersIcon,
    VolleyballIcon,
    WalletIcon,
    WarehouseIcon,
    WrenchIcon,
} from 'lucide-react';

/**
 * The icons offered for a service, keyed by their lucide name — the value
 * stored on the row, so existing data keeps working.
 *
 * Deliberately a short, hand-picked set rather than every lucide icon: the
 * `lucide-react/dynamic` import this replaces code-splits per icon, which made
 * Vite pre-bundle ~1600 separate chunks and slowed every dev start. Static
 * imports come from the `lucide-react` bundle the panel already loads.
 *
 * Adding one is two lines: import it, add a row here.
 */
const icons: Record<string, { icon: LucideIcon; label: string }> = {
    // Kit and products
    shirt: { icon: ShirtIcon, label: 'Shirt' },
    footprints: { icon: FootprintsIcon, label: 'Footwear' },
    dumbbell: { icon: DumbbellIcon, label: 'Dumbbell' },
    volleyball: { icon: VolleyballIcon, label: 'Ball' },
    bike: { icon: BikeIcon, label: 'Bike' },
    goal: { icon: GoalIcon, label: 'Goal' },
    target: { icon: TargetIcon, label: 'Target' },
    activity: { icon: ActivityIcon, label: 'Activity' },
    timer: { icon: TimerIcon, label: 'Timer' },
    flag: { icon: FlagIcon, label: 'Flag' },

    // Shop and orders
    'shopping-bag': { icon: ShoppingBagIcon, label: 'Shopping bag' },
    'shopping-cart': { icon: ShoppingCartIcon, label: 'Shopping cart' },
    store: { icon: StoreIcon, label: 'Store' },
    tag: { icon: TagIcon, label: 'Tag' },
    tags: { icon: TagsIcon, label: 'Tags' },
    'ticket-percent': { icon: TicketPercentIcon, label: 'Voucher' },
    'badge-percent': { icon: BadgePercentIcon, label: 'Discount' },
    gift: { icon: GiftIcon, label: 'Gift' },
    receipt: { icon: ReceiptIcon, label: 'Receipt' },
    barcode: { icon: BarcodeIcon, label: 'Barcode' },
    'qr-code': { icon: QrCodeIcon, label: 'QR code' },

    // Payment
    'credit-card': { icon: CreditCardIcon, label: 'Card payment' },
    wallet: { icon: WalletIcon, label: 'Wallet' },
    banknote: { icon: BanknoteIcon, label: 'Banknote' },
    'hand-coins': { icon: HandCoinsIcon, label: 'Pricing' },
    'circle-dollar-sign': { icon: CircleDollarSignIcon, label: 'Cost' },

    // Fulfilment
    package: { icon: PackageIcon, label: 'Package' },
    box: { icon: BoxIcon, label: 'Box' },
    boxes: { icon: BoxesIcon, label: 'Bulk order' },
    truck: { icon: TruckIcon, label: 'Delivery' },
    warehouse: { icon: WarehouseIcon, label: 'Warehouse' },
    'refresh-cw': { icon: RefreshCwIcon, label: 'Returns' },

    // Customisation and production
    palette: { icon: PaletteIcon, label: 'Colours' },
    brush: { icon: BrushIcon, label: 'Design' },
    'pen-tool': { icon: PenToolIcon, label: 'Artwork' },
    scissors: { icon: ScissorsIcon, label: 'Tailoring' },
    ruler: { icon: RulerIcon, label: 'Sizing' },
    printer: { icon: PrinterIcon, label: 'Printing' },
    stamp: { icon: StampIcon, label: 'Embroidery' },
    layers: { icon: LayersIcon, label: 'Layers' },
    hammer: { icon: HammerIcon, label: 'Manufacturing' },
    wrench: { icon: WrenchIcon, label: 'Repairs' },
    settings: { icon: SettingsIcon, label: 'Custom fit' },

    // Trust and quality
    trophy: { icon: TrophyIcon, label: 'Trophy' },
    medal: { icon: MedalIcon, label: 'Medal' },
    award: { icon: AwardIcon, label: 'Award' },
    crown: { icon: CrownIcon, label: 'Premium' },
    'shield-check': { icon: ShieldCheckIcon, label: 'Guarantee' },
    star: { icon: StarIcon, label: 'Star' },
    sparkles: { icon: SparklesIcon, label: 'New' },
    flame: { icon: FlameIcon, label: 'Popular' },
    heart: { icon: HeartIcon, label: 'Favourite' },

    // Service and contact
    headset: { icon: HeadsetIcon, label: 'Support' },
    phone: { icon: PhoneIcon, label: 'Phone' },
    mail: { icon: MailIcon, label: 'Email' },
    'message-square': { icon: MessageSquareIcon, label: 'Enquiry' },
    users: { icon: UsersIcon, label: 'Teams' },
    calendar: { icon: CalendarIcon, label: 'Calendar' },
    clock: { icon: ClockIcon, label: 'Turnaround' },
    'map-pin': { icon: MapPinIcon, label: 'Location' },
    search: { icon: SearchIcon, label: 'Search' },
};

export const serviceIconNames = Object.keys(icons);

/** Renders a service icon by name, or nothing if the name is unknown. */
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
    const Icon = icons[name]?.icon;

    return Icon ? <Icon className={className} /> : null;
}

/** The picker's label for a name, falling back to the raw name. */
export function serviceIconLabel(name: string): string {
    return icons[name]?.label ?? name;
}
