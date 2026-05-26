const bookRepository = require('../repositories/book.repository');
const bookCopyRepository = require('../repositories/book-copy.repository');

class BookService {
  async getBooks(query = {}, scope = {}) {
    const { page, pageSize, limit, ...filters } = query;
    return bookRepository.findAll({ page, pageSize: pageSize || limit, filters }, scope);
  }

  async getBookById(id, scope = {}) {
    return bookRepository.findById(id, scope);
  }

  async createBook(data, scope = {}) {
    const totalCopies = parseInt(data.total_copies, 10) || 1;
    const bookData = {
      ...data,
      total_copies: totalCopies,
      available_copies: totalCopies
    };

    const book = await bookRepository.create(bookData, scope);

    // Auto-create physical copies if book_type is physical or both
    if (bookData.book_type !== 'digital' && totalCopies > 0) {
      const copies = await bookCopyRepository.createBulk(book.id, totalCopies, {
        isbn: data.isbn,
        acquired_date: data.acquired_date,
        price: data.price,
        shelf_location: data.shelf_location
      }, scope);
      book.copies = copies;
    }

    return book;
  }

  async updateBook(id, data, scope = {}) {
    return bookRepository.updateById(id, data, scope);
  }

  async deleteBook(id, scope = {}) {
    return bookRepository.deleteById(id, scope);
  }

  // Copy management
  async getBookCopies(bookId, scope = {}) {
    // Verify book exists
    await bookRepository.findById(bookId, scope);
    return bookCopyRepository.findByBookId(bookId, scope);
  }

  async addBookCopy(bookId, data, scope = {}) {
    const book = await bookRepository.findById(bookId, scope);

    // Get current copy count for copy_number
    const counts = await bookCopyRepository.countByBookId(bookId, scope);
    const copyData = {
      ...data,
      book_id: bookId,
      copy_number: counts.total + 1,
      isbn: book.isbn
    };

    const copy = await bookCopyRepository.create(copyData, scope);

    // Update book counts
    await bookRepository.updateById(bookId, {
      total_copies: counts.total + 1,
      available_copies: counts.available + 1
    }, scope);

    return copy;
  }

  async updateBookCopy(copyId, data, scope = {}) {
    return bookCopyRepository.updateById(copyId, data, scope);
  }

  async deleteBookCopy(copyId, scope = {}) {
    const copy = await bookCopyRepository.findById(copyId, scope);
    const result = await bookCopyRepository.deleteById(copyId, scope);

    // Update book counts
    const counts = await bookCopyRepository.countByBookId(copy.book_id, scope);
    await bookRepository.updateById(copy.book_id, {
      total_copies: counts.total,
      available_copies: counts.available
    }, scope);

    return result;
  }

  async findCopyByBarcode(barcode, scope = {}) {
    return bookCopyRepository.findByBarcode(barcode, scope);
  }
}

module.exports = new BookService();
