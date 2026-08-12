"""Build and render Creamy from one deterministic Blender scene.

Run with Blender, not CPython:
  blender --background --factory-startup --python design/mascot/build_creamy.py -- --render all
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR / "render_config.json"
DEFAULT_OUTPUT = SCRIPT_DIR / "output"


@dataclass
class CreamyRig:
    root: bpy.types.Object
    fill: bpy.types.Object
    fill_top: bpy.types.Object
    swirl: list[bpy.types.Object]
    eyes: list[bpy.types.Object]
    eye_highlights: list[bpy.types.Object]
    closed_eyes: list[bpy.types.Object]
    brows: list[bpy.types.Object]
    mouths: dict[str, bpy.types.Object]
    blush: list[bpy.types.Object]
    arms: list[bpy.types.Object]
    ingredients: list[bpy.types.Object]
    sparkles: list[bpy.types.Object]
    pour: bpy.types.Object


def parse_args() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--render", choices=("all", "welcome", "poster", "tutorial", "none"), default="all")
    parser.add_argument("--seed", type=int)
    parser.add_argument("--tutorial-limit", type=int, help="Render only the first N tutorial states for a quick visual check.")
    parser.add_argument("--no-save-blend", action="store_true")
    return parser.parse_args(raw)


def load_config(path: Path) -> dict[str, Any]:
    with path.resolve().open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    if config.get("schemaVersion") != 1:
        raise ValueError(f"Unsupported render config schema: {config.get('schemaVersion')!r}")
    return config


def srgb_to_linear(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def rgba(values: Iterable[float]) -> tuple[float, float, float, float]:
    items = list(values)
    return tuple(srgb_to_linear(v) for v in items[:3]) + (items[3],)  # type: ignore[return-value]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def set_engine(scene: bpy.types.Scene, requested: str) -> None:
    errors: list[str] = []
    for candidate in (requested, "BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = candidate
            return
        except TypeError as error:
            errors.append(str(error))
    raise RuntimeError(f"No Eevee engine is available: {'; '.join(errors)}")


def set_if_supported(target: Any, property_name: str, value: Any) -> None:
    """Set an RNA property when it exists in the installed Blender build."""
    if hasattr(target, property_name):
        setattr(target, property_name, value)


def make_material(name: str, color: Iterable[float], *, metallic: float = 0.0, roughness: float = 0.35, emission: float = 0.0, transmission: float = 0.0, alpha: float = 1.0, ior: float = 1.45) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError("Principled BSDF node is unavailable")
    base = rgba(color)
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs:
        bsdf.inputs["Transmission"].default_value = transmission
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = ior
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    if emission > 0:
        emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength_input = bsdf.inputs.get("Emission Strength")
        if emission_input is not None:
            emission_input.default_value = base
        if strength_input is not None:
            strength_input.default_value = emission
    mat.diffuse_color = (base[0], base[1], base[2], alpha)
    if alpha < 1.0:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
        if hasattr(mat, "use_transparency_overlap"):
            mat.use_transparency_overlap = False
    return mat


def assign(obj: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    obj.data.materials.append(material)
    return obj


def parent(obj: bpy.types.Object, root: bpy.types.Object) -> bpy.types.Object:
    obj.parent = root
    return obj


def smooth(obj: bpy.types.Object) -> bpy.types.Object:
    if getattr(obj.data, "polygons", None):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def add_uv_sphere(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], material: bpy.types.Material, root: bpy.types.Object, segments: int = 48) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=24, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(smooth(obj), material)
    return parent(obj, root)


def add_curve(name: str, points: list[tuple[float, float, float]], material: bpy.types.Material, root: bpy.types.Object, bevel: float = 0.035) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = bevel
    curve.bevel_resolution = 5
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    assign(obj, material)
    return parent(obj, root)


def create_shell(root: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    segments = 96
    z0, z1 = -1.25, 1.12
    outer0, outer1 = 1.04, 1.24
    inner0, inner1 = 0.96, 1.16
    vertices: list[tuple[float, float, float]] = []
    for radius, z in ((outer0, z0), (outer1, z1), (inner0, z0 + 0.07), (inner1, z1 - 0.03)):
        vertices.extend((radius * math.cos(2 * math.pi * i / segments), radius * math.sin(2 * math.pi * i / segments), z) for i in range(segments))
    faces: list[tuple[int, ...]] = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((i, j, segments + j, segments + i))
        faces.append((2 * segments + i, 3 * segments + i, 3 * segments + j, 2 * segments + j))
        faces.append((i, 2 * segments + i, 2 * segments + j, j))
    mesh = bpy.data.meshes.new("Creamy_ClearPintMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    shell = bpy.data.objects.new("Creamy_ClearPint", mesh)
    bpy.context.collection.objects.link(shell)
    assign(smooth(shell), material)
    parent(shell, root)
    bevel = shell.modifiers.new("Soft plastic edges", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 3
    return shell


def add_torus(name: str, major: float, minor: float, z: float, material: bpy.types.Material, root: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=96, minor_segments=16, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    assign(smooth(obj), material)
    return parent(obj, root)


def make_rig(config: dict[str, Any]) -> CreamyRig:
    colors = config["palette"]
    plastic = make_material("MAT_Clear_Unbranded_Plastic", colors["white"], roughness=0.12, transmission=0.88, alpha=0.24, ior=1.47)
    pink = make_material("MAT_Strawberry_Fill", colors["lightPink"], roughness=0.26)
    dark = make_material("MAT_Face_Black", colors["black"], roughness=0.18)
    white = make_material("MAT_Eye_Highlight", colors["white"], roughness=0.12, emission=0.15)
    blush_mat = make_material("MAT_Blush", colors["pink"], roughness=0.3)
    sparkle_mat = make_material("MAT_Sparkle", colors["cream"], roughness=0.2, emission=4.0)
    green = make_material("MAT_Leaf", [0.14, 0.6, 0.18, 1.0], roughness=0.42)
    berry = make_material("MAT_Berry", [0.95, 0.025, 0.08, 1.0], roughness=0.32)
    chocolate = make_material("MAT_Chocolate", [0.22, 0.055, 0.025, 1.0], roughness=0.45)
    powder = make_material("MAT_Powder", colors["cream"], roughness=0.8)

    root = bpy.data.objects.new("Creamy_Root", None)
    bpy.context.collection.objects.link(root)
    create_shell(root, plastic)
    add_torus("Creamy_Rim_Upper", 1.25, 0.065, 1.13, plastic, root)
    add_torus("Creamy_Rim_Lower", 1.19, 0.04, 0.98, plastic, root)
    add_torus("Creamy_Base_Ring", 1.04, 0.035, -1.22, plastic, root)

    bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=0.99, radius2=1.14, depth=2.12, location=(0, 0, -0.13))
    fill = bpy.context.object
    fill.name = "Creamy_Fill"
    assign(smooth(fill), pink)
    parent(fill, root)
    fill["base_depth"] = 2.12
    fill["bottom_z"] = -1.18

    fill_top = add_uv_sphere("Creamy_Fill_Surface", (0, 0, -1.16), (1.1, 1.1, 0.12), pink, root)
    swirl = [
        add_uv_sphere("Creamy_Swirl_Lower", (0, 0, 1.06), (1.06, 1.06, 0.26), pink, root),
        add_uv_sphere("Creamy_Swirl_Middle", (0.08, 0, 1.34), (0.72, 0.72, 0.24), pink, root),
        add_uv_sphere("Creamy_Swirl_Top", (-0.04, 0, 1.56), (0.36, 0.36, 0.3), pink, root),
    ]
    for obj in swirl:
        obj["base_scale"] = list(obj.scale)

    eyes = [add_uv_sphere(f"Eye_{side}", (x, -1.205, -0.12), (0.16, 0.055, 0.23), dark, root) for side, x in (("L", -0.35), ("R", 0.35))]
    eye_highlights = [add_uv_sphere(f"EyeHighlight_{side}", (x - 0.045, -1.263, 0.01), (0.047, 0.022, 0.07), white, root, 24) for side, x in (("L", -0.35), ("R", 0.35))]
    closed_eyes = [
        add_curve("ClosedEye_L", [(-0.49, -1.255, -0.1), (-0.35, -1.275, -0.15), (-0.21, -1.255, -0.1)], dark, root, 0.027),
        add_curve("ClosedEye_R", [(0.21, -1.255, -0.1), (0.35, -1.275, -0.15), (0.49, -1.255, -0.1)], dark, root, 0.027),
    ]
    brows = [
        add_curve("Brow_L", [(-0.51, -1.25, 0.22), (-0.36, -1.27, 0.28), (-0.22, -1.25, 0.23)], dark, root, 0.028),
        add_curve("Brow_R", [(0.22, -1.25, 0.23), (0.36, -1.27, 0.28), (0.51, -1.25, 0.22)], dark, root, 0.028),
    ]
    mouths = {
        "happy": add_curve("Mouth_Happy", [(-0.24, -1.27, -0.48), (0, -1.29, -0.61), (0.24, -1.27, -0.48)], dark, root, 0.04),
        "bored": add_curve("Mouth_Bored", [(-0.19, -1.27, -0.53), (0, -1.28, -0.48), (0.19, -1.27, -0.53)], dark, root, 0.035),
        "concerned": add_curve("Mouth_Concerned", [(-0.2, -1.27, -0.58), (0, -1.29, -0.48), (0.2, -1.27, -0.58)], dark, root, 0.04),
        "angry": add_curve("Mouth_Angry", [(-0.25, -1.27, -0.58), (0, -1.29, -0.43), (0.25, -1.27, -0.58)], dark, root, 0.05),
        "open": add_uv_sphere("Mouth_Open", (0, -1.24, -0.51), (0.25, 0.055, 0.2), dark, root, 32),
        "frightened": add_uv_sphere("Mouth_Frightened", (0, -1.24, -0.5), (0.17, 0.055, 0.26), dark, root, 32),
    }
    blush = [add_uv_sphere(f"Blush_{side}", (x, -1.245, -0.42), (0.13, 0.025, 0.085), blush_mat, root, 24) for side, x in (("L", -0.68), ("R", 0.68))]

    arms = [
        add_curve("Arm_L", [(-1.02, 0, -0.12), (-1.35, -0.05, 0.02), (-1.54, -0.08, 0.29)], pink, root, 0.09),
        add_curve("Arm_R", [(1.02, 0, -0.12), (1.35, -0.05, 0.02), (1.54, -0.08, 0.29)], pink, root, 0.09),
    ]
    for side, x in (("L", -1.55), ("R", 1.55)):
        arms.append(add_uv_sphere(f"Hand_{side}", (x, -0.08, 0.31), (0.18, 0.12, 0.25), pink, root, 32))

    ingredients: list[bpy.types.Object] = []
    for index, (x, y, z) in enumerate(((-1.8, 0, 1.3), (1.75, 0, 1.45), (-1.65, 0, -0.2))):
        berry_obj = add_uv_sphere(f"Strawberry_{index}", (x, y, z), (0.22, 0.16, 0.3), berry, root, 32)
        berry_obj.rotation_euler[1] = (index - 1) * 0.3
        ingredients.append(berry_obj)
        leaf = add_uv_sphere(f"Leaf_{index}", (x, y, z + 0.27), (0.15, 0.08, 0.05), green, root, 20)
        ingredients.append(leaf)
    for index, (x, z) in enumerate(((1.6, 0.35), (-1.65, 0.75), (1.45, -0.55))):
        bpy.ops.mesh.primitive_cube_add(size=0.34, location=(x, 0, z), rotation=(0.2, 0.35, index * 0.4))
        cube = bpy.context.object
        cube.name = f"Chocolate_{index}"
        assign(cube, chocolate)
        parent(cube, root)
        ingredients.append(cube)
    for index in range(14):
        angle = index * 2.399963
        radius = 1.45 + 0.35 * (index % 3)
        ingredients.append(add_uv_sphere(f"PowderPearl_{index}", (radius * math.cos(angle), 0.03, radius * math.sin(angle) * 0.7 + 0.3), (0.055, 0.04, 0.055), powder, root, 16))

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.12, depth=2.1, location=(0.1, 0, 2.0))
    pour = bpy.context.object
    pour.name = "Creamy_Pour_Stream"
    assign(smooth(pour), pink)
    parent(pour, root)

    sparkles: list[bpy.types.Object] = []
    for index, angle in enumerate((0.25, 1.35, 2.65, 3.85, 5.1)):
        radius = 1.55 + 0.15 * (index % 2)
        sparkle = add_uv_sphere(f"Sparkle_{index}", (radius * math.cos(angle), 0.02, radius * math.sin(angle) * 0.78 + 0.25), (0.055, 0.04, 0.055), sparkle_mat, root, 16)
        sparkles.append(sparkle)

    rig = CreamyRig(root, fill, fill_top, swirl, eyes, eye_highlights, closed_eyes, brows, mouths, blush, arms, ingredients, sparkles, pour)
    set_fill(rig, 0.0)
    set_expression(rig, "bored", False)
    set_group_visible(rig.ingredients + rig.sparkles + rig.arms + [rig.pour], False)
    return rig


def set_group_visible(objects: Iterable[bpy.types.Object], visible: bool, *, keyframe: int | None = None) -> None:
    for obj in objects:
        obj.hide_render = not visible
        obj.hide_viewport = not visible
        if keyframe is not None:
            obj.keyframe_insert("hide_render", frame=keyframe)


def set_fill(rig: CreamyRig, fraction: float, *, keyframe: int | None = None) -> None:
    visible_fraction = max(0.001, min(fraction, 1.12))
    depth = float(rig.fill["base_depth"])
    bottom = float(rig.fill["bottom_z"])
    rig.fill.scale.z = visible_fraction
    rig.fill.location.z = bottom + (depth * visible_fraction) / 2
    rig.fill.hide_render = fraction <= 0
    rig.fill_top.location.z = bottom + depth * min(fraction, 1.02)
    rig.fill_top.scale = (1.1, 1.1, 0.08 + 0.04 * min(fraction, 1.0))
    rig.fill_top.hide_render = fraction <= 0
    show_swirl = fraction >= 0.98
    set_group_visible(rig.swirl, show_swirl)
    for index, obj in enumerate(rig.swirl):
        base_scale = Vector(obj["base_scale"])
        overflow_scale = 1.0 + max(0.0, fraction - 1.0) * (0.7 - index * 0.12)
        obj.scale = base_scale * overflow_scale
    if keyframe is not None:
        rig.fill.keyframe_insert("scale", frame=keyframe)
        rig.fill.keyframe_insert("location", frame=keyframe)
        rig.fill.keyframe_insert("hide_render", frame=keyframe)
        rig.fill_top.keyframe_insert("location", frame=keyframe)
        rig.fill_top.keyframe_insert("scale", frame=keyframe)
        rig.fill_top.keyframe_insert("hide_render", frame=keyframe)
        for obj in rig.swirl:
            obj.keyframe_insert("hide_render", frame=keyframe)


def set_expression(rig: CreamyRig, expression: str, mouth_open: bool, *, blink: bool = False, keyframe: int | None = None) -> None:
    eye_closed = blink or expression == "celebration"
    set_group_visible(rig.eyes + rig.eye_highlights, not eye_closed, keyframe=keyframe)
    set_group_visible(rig.closed_eyes, eye_closed, keyframe=keyframe)
    show_brows = expression in {"concerned", "frightened", "angry"}
    set_group_visible(rig.brows, show_brows, keyframe=keyframe)
    for index, brow in enumerate(rig.brows):
        brow.rotation_euler[1] = (0.25 if index == 0 else -0.25) if expression == "angry" else (-0.12 if index == 0 else 0.12)
        if keyframe is not None:
            brow.keyframe_insert("rotation_euler", frame=keyframe)
    for mouth in rig.mouths.values():
        set_group_visible([mouth], False, keyframe=keyframe)
    if expression == "frightened":
        mouth_name = "frightened" if mouth_open else "concerned"
    elif mouth_open:
        mouth_name = "open"
    elif expression == "bored":
        mouth_name = "bored"
    elif expression == "concerned":
        mouth_name = "concerned"
    elif expression == "angry":
        mouth_name = "angry"
    else:
        mouth_name = "happy"
    set_group_visible([rig.mouths[mouth_name]], True, keyframe=keyframe)
    set_group_visible(rig.arms, expression == "celebration", keyframe=keyframe)


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_scene(config: dict[str, Any]) -> tuple[bpy.types.Scene, bpy.types.Object]:
    scene = bpy.context.scene
    set_engine(scene, str(config["engine"]))
    scene.render.fps = int(config["fps"])
    scene.render.fps_base = 1.0
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.use_file_extension = True
    scene.render.use_persistent_data = True
    scene.render.film_transparent = False
    if scene.render.engine == "CYCLES":
        scene.cycles.device = "CPU"
        scene.cycles.samples = int(config["welcome"]["samples"])
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.adaptive_threshold = 0.12
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 5
        scene.cycles.transparent_max_bounces = 4
    elif hasattr(scene, "eevee"):
        set_if_supported(scene.eevee, "taa_render_samples", int(config["welcome"]["samples"]))
        set_if_supported(scene.eevee, "use_gtao", True)
        set_if_supported(scene.eevee, "gtao_distance", 3)
        set_if_supported(scene.eevee, "gtao_factor", 1.2)
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "None"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = 0.2
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = rgba(config["welcome"]["background"])
        background.inputs["Strength"].default_value = 1.0

    bpy.ops.object.camera_add(location=(0, -7.4, 0.2))
    camera = bpy.context.object
    camera.name = "Creamy_Camera"
    camera.data.lens = 57
    point_at(camera, (0, 0, 0.05))
    scene.camera = camera

    light_specs = (
        ("Key_Pink", "AREA", (-3.8, -4.0, 5.4), 880.0, [1.0, 0.12, 0.42], 4.2),
        ("Fill_Cyan", "AREA", (4.0, -2.5, 3.4), 720.0, [0.15, 0.72, 1.0], 3.6),
        ("Rim_White", "AREA", (0.3, 2.5, 5.5), 1050.0, [1.0, 0.83, 0.95], 3.0),
        ("Front_Soft", "AREA", (0, -4.0, 0.2), 360.0, [0.85, 0.9, 1.0], 4.8),
    )
    for name, kind, location, energy, color, size in light_specs:
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        point_at(obj, (0, 0, 0))
    return scene, camera


def clear_animation(rig: CreamyRig) -> None:
    for obj in [rig.root, rig.fill, rig.fill_top, rig.pour, *rig.swirl, *rig.eyes, *rig.eye_highlights, *rig.closed_eyes, *rig.brows, *rig.mouths.values(), *rig.arms, *rig.ingredients, *rig.sparkles]:
        obj.animation_data_clear()


def key_transform(obj: bpy.types.Object, frame: int) -> None:
    obj.keyframe_insert("location", frame=frame)
    obj.keyframe_insert("rotation_euler", frame=frame)
    obj.keyframe_insert("scale", frame=frame)


def set_constant_interpolation() -> None:
    for action in bpy.data.actions:
        for curve in action.fcurves:
            if curve.data_path == "hide_render":
                for point in curve.keyframe_points:
                    point.interpolation = "CONSTANT"
            else:
                for point in curve.keyframe_points:
                    point.interpolation = "BEZIER"
                    point.handle_left_type = "AUTO_CLAMPED"
                    point.handle_right_type = "AUTO_CLAMPED"


def build_entrance(rig: CreamyRig, frames: int) -> None:
    at = lambda original: max(1, round(original * frames / 120))
    clear_animation(rig)
    rig.root.location = (0, 0, -0.08)
    rig.root.scale = (0.82, 0.82, 0.82)
    key_transform(rig.root, at(1))
    rig.root.scale = (1, 1, 1)
    key_transform(rig.root, at(15))
    set_fill(rig, 0.0, keyframe=at(1))
    set_expression(rig, "bored", False, keyframe=at(1))

    set_group_visible(rig.ingredients, False, keyframe=at(1))
    set_group_visible(rig.ingredients, True, keyframe=at(18))
    for index, obj in enumerate(rig.ingredients):
        original = obj.location.copy()
        obj.scale *= 0.2
        obj.location = original * 1.45 + Vector((0, 0, 0.55))
        key_transform(obj, at(18 + index % 5))
        obj.scale /= 0.2
        obj.location = original
        key_transform(obj, at(34 + index % 7))
        obj.location = Vector((0.05 * math.sin(index), 0.0, 1.0 + 0.06 * (index % 4)))
        obj.scale *= 0.05
        key_transform(obj, at(82 + index % 8))
        obj.hide_render = True
        obj.keyframe_insert("hide_render", frame=at(92 + index % 4))

    set_group_visible([rig.pour], False, keyframe=at(1))
    set_group_visible([rig.pour], True, keyframe=at(38))
    rig.pour.scale = (1, 1, 0.05)
    key_transform(rig.pour, at(38))
    rig.pour.scale = (1, 1, 1)
    key_transform(rig.pour, at(47))
    key_transform(rig.pour, at(82))
    rig.pour.scale = (1, 1, 0.05)
    key_transform(rig.pour, at(88))
    set_group_visible([rig.pour], False, keyframe=at(90))

    for frame, amount in ((38, 0.0), (49, 0.18), (63, 0.44), (77, 0.7), (91, 1.0)):
        set_fill(rig, amount, keyframe=at(frame))
    set_expression(rig, "bored", False, keyframe=at(44))
    set_expression(rig, "happy", True, keyframe=at(70))
    set_expression(rig, "happy", False, keyframe=at(98))

    set_group_visible(rig.sparkles, False, keyframe=at(1))
    set_group_visible(rig.sparkles, True, keyframe=at(99))
    for index, sparkle in enumerate(rig.sparkles):
        base = sparkle.scale.copy()
        sparkle.scale = base * 0.02
        key_transform(sparkle, at(99 + index))
        sparkle.scale = base * (1.15 + 0.1 * index)
        key_transform(sparkle, at(107 + index))
        sparkle.scale = base
        key_transform(sparkle, frames)

    rig.root.rotation_euler = (0, 0, 0)
    key_transform(rig.root, at(98))
    rig.root.rotation_euler[1] = math.radians(-5)
    rig.root.rotation_euler[2] = math.radians(4)
    key_transform(rig.root, at(108))
    rig.root.rotation_euler[1] = math.radians(2)
    rig.root.rotation_euler[2] = math.radians(-2)
    key_transform(rig.root, at(114))
    rig.root.rotation_euler = (0, 0, 0)
    key_transform(rig.root, frames)
    set_constant_interpolation()


def build_idle(rig: CreamyRig, frames: int) -> None:
    clear_animation(rig)
    set_fill(rig, 1.0)
    set_expression(rig, "happy", False)
    set_group_visible(rig.ingredients + rig.arms + [rig.pour], False)
    set_group_visible(rig.sparkles, True)
    for frame in range(1, frames + 1):
        phase = 2 * math.pi * (frame - 1) / max(1, frames - 1)
        rig.root.location = (0, 0, -0.08 + 0.035 * math.sin(phase))
        rig.root.rotation_euler = (0, math.radians(2.2) * math.sin(phase), math.radians(1.1) * math.sin(phase))
        rig.root.scale = (1.0 + 0.007 * math.sin(phase), 1.0, 1.0)
        key_transform(rig.root, frame)
        blink = 34 <= frame <= 37
        set_expression(rig, "happy", False, blink=blink, keyframe=frame)
        for index, sparkle in enumerate(rig.sparkles):
            pulse = 0.72 + 0.32 * (1 + math.sin(phase * 2 + index * 1.7)) / 2
            sparkle.scale = (0.055 * pulse, 0.04 * pulse, 0.055 * pulse)
            key_transform(sparkle, frame)
    set_constant_interpolation()


def configure_resolution(scene: bpy.types.Scene, width: int, height: int, samples: int) -> None:
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = samples
    elif hasattr(scene, "eevee"):
        set_if_supported(scene.eevee, "taa_render_samples", samples)


def configure_video(scene: bpy.types.Scene, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.audio_codec = "NONE"
    if hasattr(scene.render.ffmpeg, "ffmpeg_preset"):
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.ffmpeg.gopsize = 15
    scene.render.filepath = str(output.resolve())


def render_welcome(scene: bpy.types.Scene, rig: CreamyRig, config: dict[str, Any], output: Path) -> None:
    spec = config["welcome"]
    configure_resolution(scene, int(spec["width"]), int(spec["height"]), int(spec["samples"]))
    scene.render.film_transparent = False
    scene.frame_start = 1
    scene.frame_end = int(spec["entranceFrames"])
    build_entrance(rig, scene.frame_end)
    configure_video(scene, output / "welcome" / "creamy-entrance.mp4")
    bpy.ops.render.render(animation=True)

    scene.frame_set(scene.frame_end)
    configure_resolution(scene, int(spec["width"]), int(spec["height"]), int(spec.get("posterSamples", spec["samples"])))
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str((output / "welcome" / "creamy-poster.png").resolve())
    bpy.ops.render.render(write_still=True)

    scene.frame_start = 1
    scene.frame_end = int(spec["idleFrames"])
    build_idle(rig, scene.frame_end)
    configure_resolution(scene, int(spec["width"]), int(spec["height"]), int(spec["samples"]))
    configure_video(scene, output / "welcome" / "creamy-idle.mp4")
    bpy.ops.render.render(animation=True)


def render_poster(scene: bpy.types.Scene, rig: CreamyRig, config: dict[str, Any], output: Path) -> None:
    spec = config["welcome"]
    configure_resolution(scene, int(spec["width"]), int(spec["height"]), int(spec.get("posterSamples", spec["samples"])))
    scene.render.film_transparent = False
    build_idle(rig, int(spec["idleFrames"]))
    scene.frame_set(1)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str((output / "welcome" / "creamy-poster.png").resolve())
    bpy.ops.render.render(write_still=True)

def render_tutorial(scene: bpy.types.Scene, rig: CreamyRig, config: dict[str, Any], output: Path, limit: int | None = None) -> list[str]:
    spec = config["tutorial"]
    configure_resolution(scene, int(spec["width"]), int(spec["height"]), int(spec["samples"]))
    scene.render.film_transparent = bool(spec["transparent"])
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    clear_animation(rig)
    set_group_visible(rig.ingredients + rig.sparkles + [rig.pour], False)
    rig.root.location = (0, 0, 0)
    rig.root.rotation_euler = (0, 0, 0)
    rig.root.scale = (1, 1, 1)
    rendered: list[str] = []
    fill_material = bpy.data.materials["MAT_Strawberry_Fill"]
    fill_bsdf = fill_material.node_tree.nodes.get("Principled BSDF")
    normal_fill = rgba(config["palette"]["lightPink"])
    angry_fill = rgba([1.0, 0.02, 0.06, 1.0])
    tutorial_dir = output / "tutorial"
    tutorial_dir.mkdir(parents=True, exist_ok=True)
    states = spec["states"][:limit] if limit else spec["states"]
    for state in states:
        fill_color = angry_fill if state["expression"] == "angry" else normal_fill
        if fill_bsdf is not None:
            fill_bsdf.inputs["Base Color"].default_value = fill_color
        fill_material.diffuse_color = fill_color
        set_fill(rig, float(state["fill"]))
        set_expression(rig, str(state["expression"]), bool(state.get("mouthOpen", False)), blink=bool(state.get("blink", False)))
        if state["expression"] == "angry":
            rig.root.rotation_euler[2] = math.radians(-2.5)
        elif state["expression"] == "celebration":
            rig.root.rotation_euler[2] = math.radians(3.5)
        else:
            rig.root.rotation_euler[2] = 0
        scene.render.filepath = str((tutorial_dir / state["file"]).resolve())
        bpy.ops.render.render(write_still=True)
        rendered.append(str(Path("tutorial") / state["file"]))
    return rendered


def write_manifest(config: dict[str, Any], output: Path, rendered_states: list[str]) -> None:
    welcome = config["welcome"]
    manifest = {
        "schemaVersion": 1,
        "seed": config["seed"],
        "generator": "design/mascot/build_creamy.py",
        "welcome": {
            "size": [welcome["width"], welcome["height"]],
            "fps": config["fps"],
            "entranceFrames": welcome["entranceFrames"],
            "idleFrames": welcome["idleFrames"],
            "entrance": "welcome/creamy-entrance.mp4",
            "idle": "welcome/creamy-idle.mp4",
            "poster": "welcome/creamy-poster.png",
        },
        "tutorial": {
            "size": [config["tutorial"]["width"], config["tutorial"]["height"]],
            "transparent": config["tutorial"]["transparent"],
            "states": rendered_states or [str(Path("tutorial") / state["file"]) for state in config["tutorial"]["states"]],
        },
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    config["seed"] = args.seed if args.seed is not None else int(config["seed"])
    random.seed(config["seed"])
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    clear_scene()
    scene, _camera = configure_scene(config)
    rig = make_rig(config)

    if not args.no_save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=str((output / "creamy-master.blend").resolve()))

    rendered_states: list[str] = []
    if args.render in {"all", "welcome"}:
        render_welcome(scene, rig, config, output)
    elif args.render == "poster":
        render_poster(scene, rig, config, output)
    if args.render in {"all", "tutorial"}:
        rendered_states = render_tutorial(scene, rig, config, output, args.tutorial_limit)
    write_manifest(config, output, rendered_states)
    print(f"Creamy assets ready in: {output}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        error_log = DEFAULT_OUTPUT / "render-error.log"
        error_log.parent.mkdir(parents=True, exist_ok=True)
        error_log.write_text(traceback.format_exc(), encoding="utf-8")
        raise
