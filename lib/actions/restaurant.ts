"use server";

import dbConnect from "@/lib/db";
import { Restaurant, IRestaurant } from "@/lib/models/Restaurant";
import { normalizeWhatsAppNumber } from "@/lib/utils/metaWhatsApp";
import { revalidatePath } from "next/cache";

export async function getRestaurantsAction() {
  await dbConnect();
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();
    return {
      success: true,
      restaurants: JSON.parse(JSON.stringify(restaurants)),
    };
  } catch (error: any) {
    console.error("Error al obtener restaurantes:", error);
    return { success: false, error: error.message, restaurants: [] };
  }
}

export async function saveRestaurantAction(data: {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  googleMapsUrl?: string;
  category?: string;
  avgPrepTimeMin?: number;
  isActive?: boolean;
  menuSummary?: string;
}) {
  await dbConnect();
  try {
    const cleanPhone = normalizeWhatsAppNumber(data.phone);
    const slug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const payload = {
      name: data.name.trim(),
      slug: slug || `restaurante-${Date.now()}`,
      phone: cleanPhone,
      address: data.address.trim(),
      googleMapsUrl: (data.googleMapsUrl || "").trim(),
      category: data.category?.trim() || "Comida Rápida",
      avgPrepTimeMin: Number(data.avgPrepTimeMin) || 25,
      isActive: data.isActive !== false,
      menuSummary: (data.menuSummary || "").trim(),
    };

    let saved;
    if (data._id) {
      saved = await Restaurant.findByIdAndUpdate(data._id, payload, { new: true });
    } else {
      saved = await Restaurant.create(payload);
    }

    revalidatePath("/admin/whatsapp");
    return { success: true, restaurant: JSON.parse(JSON.stringify(saved)) };
  } catch (error: any) {
    console.error("Error al guardar restaurante:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRestaurantAction(id: string) {
  await dbConnect();
  try {
    await Restaurant.findByIdAndDelete(id);
    revalidatePath("/admin/whatsapp");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar restaurante:", error);
    return { success: false, error: error.message };
  }
}

export async function seedDefaultRestaurantsAction() {
  await dbConnect();
  try {
    const count = await Restaurant.countDocuments();
    if (count > 0) {
      return { success: true, message: "Ya existen restaurantes cargados." };
    }

    const defaultRestaurants = [
      {
        name: "Burger House Centro",
        slug: "burger-house-centro",
        phone: "584121112233",
        address: "Av. Universidad, entre esquinas Sociedad y San Francisco, Local 4",
        googleMapsUrl: "https://maps.google.com/?q=10.5050,-66.9145",
        category: "Hamburguesas & Snacks",
        avgPrepTimeMin: 20,
        isActive: true,
        menuSummary: "Combo 1 Clásica + Papas ($6), Combo 2 Doble Carne ($8), Combo Familiar 4 Hamburguesas ($20), Refrescos ($1.5)",
      },
      {
        name: "Pizzería Bella Napoli",
        slug: "pizzeria-bella-napoli",
        phone: "584124445566",
        address: "Calle Los Mangos, Edif. Colonial, PB, El Rosal",
        googleMapsUrl: "https://maps.google.com/?q=10.4912,-66.8653",
        category: "Pizzas & Pastas",
        avgPrepTimeMin: 30,
        isActive: true,
        menuSummary: "Pizza Margarita ($9), Pizza Pepperoni ($12), Pizza 4 Quesos ($14), Porción Tiramisú ($4)",
      },
      {
        name: "Pollo & Brasas Express",
        slug: "pollo-brasas-express",
        phone: "584127778899",
        address: "Av. Francisco de Miranda, Chacao, frente a la estación",
        googleMapsUrl: "https://maps.google.com/?q=10.4930,-66.8524",
        category: "Pollo en Brasas & Parrillas",
        avgPrepTimeMin: 25,
        isActive: true,
        menuSummary: "1 Pollo Asado + Hayaquitas + Guasacaca ($12), Combo 1/2 Pollo ($7), Parrilla Mixta ($15)",
      },
    ];

    await Restaurant.insertMany(defaultRestaurants);
    revalidatePath("/admin/whatsapp");
    return { success: true, count: defaultRestaurants.length };
  } catch (error: any) {
    console.error("Error al sembrar restaurantes:", error);
    return { success: false, error: error.message };
  }
}
