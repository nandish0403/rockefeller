import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

const _defaultMapTilerApiKey = 'hBzxKkVoB5ZZhS5ANfSI';
const _mapTilerApiKey = String.fromEnvironment(
  'MAPTILER_API_KEY',
  defaultValue: _defaultMapTilerApiKey,
);
const _mapTilerUrlTemplate =
  'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key={key}';
const _fallbackTileUrlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();
  ZoneModel? _selectedZone;
  bool _didAutoFit = false;

  @override
  Widget build(BuildContext context) {
    final zonesAsync = ref.watch(zonesProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Stack(
        children: [
          // ── Full Screen Map ────────────────────────────────────────────
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(19.9975, 79.0012), // Chandrapur, Maharashtra
              initialZoom: 8,
              onTap: (_, __) => setState(() => _selectedZone = null),
            ),
            children: [
              // Dark tile layer from Stadia Maps
              TileLayer(
                urlTemplate: _mapTilerApiKey.isNotEmpty
                    ? _mapTilerUrlTemplate
                    : _fallbackTileUrlTemplate,
                additionalOptions:
                    _mapTilerApiKey.isNotEmpty ? {'key': _mapTilerApiKey} : const {},
                userAgentPackageName: 'com.rockefeller.minesafe',
              ),
              // Zone polygon overlays
              zonesAsync.when(
                data: (zones) {
                  final mappedZones = zones
                      .where((z) => z.latitude != null && z.longitude != null)
                      .toList();
                  _autoFitToZones(mappedZones);
                  final polygons = mappedZones.map(_buildZonePolygon).toList();
                  return PolygonLayer<Object>(polygons: polygons);
                },
                loading: () => const PolygonLayer<Object>(polygons: []),
                error: (_, __) => const PolygonLayer<Object>(polygons: []),
              ),
              // Zone circle indicators
              zonesAsync.when(
                data: (zones) => CircleLayer<Object>(
                  circles: zones
                      .where((z) => z.latitude != null && z.longitude != null)
                      .map((z) => CircleMarker<Object>(
                            point: LatLng(z.latitude!, z.longitude!),
                            radius: 12,
                            color: _riskColor(z.riskLevel)
                                .withAlpha((0.4 * 255).toInt()),
                            borderColor: _riskColor(z.riskLevel),
                            borderStrokeWidth: 1.5,
                            useRadiusInMeter: false,
                          ))
                      .toList(),
                ),
                loading: () => const CircleLayer<Object>(circles: []),
                error: (_, __) => const CircleLayer<Object>(circles: []),
              ),
              // Marker layer for zone taps
              zonesAsync.when(
                data: (zones) {
                  final mappedZones = zones
                      .where((z) => z.latitude != null && z.longitude != null)
                      .toList();
                  _autoFitToZones(mappedZones);
                  return MarkerLayer(
                    markers: mappedZones.map(_buildZoneTapMarker).toList(),
                  );
                },
                loading: () => const MarkerLayer(markers: []),
                error: (_, __) => const MarkerLayer(markers: []),
              ),
            ],
          ),

          // ── Coordinate Strip ──────────────────────────────────────────
          Positioned(
            top: 0, left: 0, right: 0,
            child: TelemetryStrip(items: const [
              TelemetryItem(label: 'LAT', value: '19.0760° N'),
              TelemetryItem(label: 'LONG', value: '72.8777° E'),
              TelemetryItem(label: 'LIVE STATUS', value: 'ACTIVE', highlighted: true),
            ]),
          ),

          Positioned(
            top: 28,
            left: 12,
            child: zonesAsync.when(
              loading: () => _ZoneStatusChip(
                text: 'Loading zones...',
                color: Colors.orange,
              ),
              error: (err, _) => _ZoneStatusChip(
                text: 'Zones error: ${err.toString()}',
                color: Colors.redAccent,
              ),
              data: (zones) {
                final mappedCount = zones
                    .where((z) => z.latitude != null && z.longitude != null)
                    .length;
                if (zones.isEmpty) {
                  return const _ZoneStatusChip(
                    text: 'No zones from backend',
                    color: Colors.redAccent,
                  );
                }
                if (mappedCount == 0) {
                  return const _ZoneStatusChip(
                    text: 'Zones loaded, but no coordinates',
                    color: Colors.redAccent,
                  );
                }
                return _ZoneStatusChip(
                  text: 'Zones: $mappedCount',
                  color: Colors.green,
                );
              },
            ),
          ),

          // ── Filter FAB ────────────────────────────────────────────────
          Positioned(
            top: 36, right: 12,
            child: Column(children: [
              _MapButton(icon: Icons.tune, onTap: () => _showFilters(context)),
              const SizedBox(height: 8),
              _FilterChip(label: 'District', color: AppTheme.errorContainer),
              const SizedBox(height: 4),
              _FilterChip(label: 'Risk Level', color: AppTheme.surfaceContainerHighest),
            ]),
          ),

          // ── Zoom Controls ─────────────────────────────────────────────
          Positioned(
            bottom: _selectedZone != null ? 240 : 36,
            left: 12,
            child: Column(children: [
              _MapButton(icon: Icons.add, onTap: () {
                final c = _mapController.camera;
                _mapController.move(c.center, c.zoom + 1);
              }),
              const SizedBox(height: 4),
              _MapButton(icon: Icons.remove, onTap: () {
                final c = _mapController.camera;
                _mapController.move(c.center, c.zoom - 1);
              }),
              const SizedBox(height: 8),
              _MapButton(icon: Icons.my_location, onTap: () {
                _mapController.move(const LatLng(19.9975, 79.0012), 10);
              }, primary: true),
            ]),
          ),

          // ── Zone Info Bottom Drawer ────────────────────────────────────
          if (_selectedZone != null)
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: _ZoneDrawer(
                zone: _selectedZone!,
                onDismiss: () => setState(() => _selectedZone = null),
              ),
            ),
        ],
      ),
    );
  }

  Polygon _buildZonePolygon(ZoneModel zone) {
    final lat = zone.latitude!;
    final lng = zone.longitude!;
    const delta = 0.15;
    return Polygon(
      points: [
        LatLng(lat + delta, lng - delta),
        LatLng(lat + delta, lng + delta),
        LatLng(lat - delta, lng + delta),
        LatLng(lat - delta, lng - delta),
      ],
      color: _riskColor(zone.riskLevel).withValues(alpha: 0.15),
      borderColor: _riskColor(zone.riskLevel),
      borderStrokeWidth: 1.5,
    );
  }

  Marker _buildZoneTapMarker(ZoneModel zone) {
    return Marker(
      point: LatLng(zone.latitude!, zone.longitude!),
      width: 30,
      height: 30,
      child: GestureDetector(
        onTap: () => setState(() => _selectedZone = zone),
        child: Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: _riskColor(zone.riskLevel),
            shape: BoxShape.circle,
            border: Border.all(
              color: _selectedZone?.id == zone.id ? Colors.white : Colors.white,
              width: _selectedZone?.id == zone.id ? 2 : 1.5,
            ),
          ),
        ),
      ),
    );
  }

  void _autoFitToZones(List<ZoneModel> zones) {
    if (_didAutoFit) return;
    final points = zones
        .map((z) => LatLng(z.latitude!, z.longitude!))
        .toList();
    if (points.isEmpty) return;
    _didAutoFit = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (points.length == 1) {
        _mapController.move(points.first, 11);
        return;
      }
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(points),
          padding: const EdgeInsets.all(48),
        ),
      );
    });
  }

  Color _riskColor(RiskLevel level) => switch (level) {
    RiskLevel.high    => AppTheme.riskHigh,
    RiskLevel.medium  => AppTheme.riskMedium,
    RiskLevel.low     => AppTheme.riskLow,
    RiskLevel.nominal => AppTheme.riskNominal,
    RiskLevel.unknown => AppTheme.riskLow,
  };

  void _showFilters(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceContainerHigh,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (_) => const _FilterSheet(),
    );
  }
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool primary;
  const _MapButton({required this.icon, required this.onTap, this.primary = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40, height: 40,
        color: primary ? AppTheme.surfaceContainerHighest : AppTheme.glassBackground,
        alignment: Alignment.center,
        child: Icon(icon, size: 18,
          color: primary ? AppTheme.primary : AppTheme.onSurface),
      ),
    );
  }
}

class _ZoneStatusChip extends StatelessWidget {
  final String text;
  final Color color;

  const _ZoneStatusChip({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 280),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.glassBackground,
        border: Border.all(color: color.withValues(alpha: 0.9), width: 1),
      ),
      child: Text(
        text,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AppTheme.onSurface,
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final Color color;
  const _FilterChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      color: color,
      child: Text(label.toUpperCase(),
        style: const TextStyle(
          fontFamily: 'Inter', fontSize: 8, fontWeight: FontWeight.w700,
          letterSpacing: 0.8, color: AppTheme.onSurface)),
    );
  }
}

class _ZoneDrawer extends StatelessWidget {
  final ZoneModel zone;
  final VoidCallback onDismiss;
  const _ZoneDrawer({required this.zone, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.glassBackground,
        border: Border(top: BorderSide(color: AppTheme.outlineVariant.withValues(alpha: 0.2))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(width: 40, height: 3, color: AppTheme.outlineVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(zone.name.toUpperCase(),
                    style: const TextStyle(
                      fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: FontWeight.w700,
                      letterSpacing: -0.5, color: AppTheme.onSurface)),
                  Row(children: [
                    Container(
                      width: 6, height: 6,
                      decoration: BoxDecoration(
                        color: zone.riskLevel == RiskLevel.high ? AppTheme.error : AppTheme.amberWarning,
                        shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 6),
                    Text(zone.sector?.toUpperCase() ?? zone.district.toUpperCase(),
                      style: const TextStyle(
                        fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w300,
                        letterSpacing: 2, color: AppTheme.onSurfaceVariant)),
                  ]),
                ]),
                RiskBadge(level: zone.riskLevel),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              color: AppTheme.outlineVariant.withValues(alpha: 0.15),
              height: 1,
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('STABILITY INDEX',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text('${zone.stabilityIndex?.toStringAsFixed(1) ?? "—"}%',
                    style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
                ]),
              ),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('PERSONNEL',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text(zone.personnelCount?.toString() ?? '—',
                    style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
                ]),
              ),
            ]),
            const SizedBox(height: 20),
            SentinelButton(label: 'View Full Analytics', onTap: onDismiss),
          ],
        ),
      ),
    );
  }
}

class _FilterSheet extends StatelessWidget {
  const _FilterSheet();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('MAP FILTERS', style: TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 11, fontWeight: FontWeight.w700,
            letterSpacing: 2, color: AppTheme.outline)),
          const SizedBox(height: 20),
          const Text('RISK LEVEL', style: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            _FilterOption(label: 'High', color: AppTheme.riskHigh),
            _FilterOption(label: 'Medium', color: AppTheme.riskMedium),
            _FilterOption(label: 'Low', color: AppTheme.riskLow),
          ]),
          const SizedBox(height: 24),
          SentinelButton(label: 'Apply Filters', onTap: () => Navigator.pop(context)),
        ],
      ),
    );
  }
}

class _FilterOption extends StatelessWidget {
  final String label;
  final Color color;
  const _FilterOption({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: color.withValues(alpha: 0.2),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, color: color),
        const SizedBox(width: 6),
        Text(label.toUpperCase(),
          style: TextStyle(fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
            letterSpacing: 1, color: color)),
      ]),
    );
  }
}
